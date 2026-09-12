import JSZip from "jszip";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { downloadStorageFile } from "@/lib/storage";
import {
  listPolaroidExportItems,
} from "@/lib/moment-export";
import { renderPolaroid } from "@/lib/polaroid";
import {
  advanceJob,
  createJob,
  getStatus,
  publicZipStatus,
  type ZipFormat,
  type ZipManifestItem,
} from "@/lib/zip-job";

export const runtime = "nodejs";
export const maxDuration = 60;

const ORIGINAL_SYNC_THRESHOLD = 100;
const POLAROID_SYNC_THRESHOLD = 20;
const requestSchema = z.object({ format: z.enum(["polaroid", "original"]).default("polaroid") });

type OwnedResult =
  | { error: "auth" | "notfound" }
  | { event: { id: string; slug: string; name: string } };

async function resolveOwnedEvent(eventId: string): Promise<OwnedResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, name")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "notfound" };
  return { event };
}

function ownedError(error: "auth" | "notfound") {
  return NextResponse.json(
    { error: error === "auth" ? "Silakan login dulu." : "Event tidak ditemukan." },
    { status: error === "auth" ? 401 : 404 },
  );
}

async function buildManifest(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  format: ZipFormat,
): Promise<ZipManifestItem[]> {
  if (format === "polaroid") {
    return (await listPolaroidExportItems(admin, eventId)).map((item) => ({
      id: item.id,
      storagePath: item.storagePath,
      caption: item.caption,
    }));
  }
  const { data, error } = await admin
    .from("photos")
    .select("id, storage_path")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("taken_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    caption: null,
  }));
}

async function createSynchronousZip(
  event: { id: string; slug: string; name: string },
  format: ZipFormat,
  manifest: ZipManifestItem[],
) {
  const zip = new JSZip();

  for (const [index, item] of manifest.entries()) {
    try {
      const bytes =
        format === "polaroid"
          ? await renderPolaroid({
              image: item.storagePath
                ? (await downloadStorageFile(item.storagePath)).bytes
                : null,
              eventName: event.name,
              caption: item.caption,
            })
          : (await downloadStorageFile(item.storagePath!)).bytes;
      zip.file(
        `${format === "polaroid" ? "polaroid" : "momen"}-${String(index + 1).padStart(4, "0")}.jpg`,
        bytes,
      );
    } catch {
      throw new Error("Beberapa momen gagal disiapkan. Coba buat ZIP lagi.");
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const owned = await resolveOwnedEvent(eventId);
  if ("error" in owned) return ownedError(owned.error);

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format unduhan tidak valid." }, { status: 400 });
  }
  const format = parsed.data.format;
  if (!allowRequest(`zip:${owned.event.id}`, 2)) {
    return NextResponse.json(
      { error: "Unduhan ZIP sedang diproses. Tunggu sebentar ya." },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  let manifest: ZipManifestItem[];
  try {
    manifest = await buildManifest(admin, owned.event.id, format);
  } catch (error) {
    console.error("[zip.manifest]", error);
    return NextResponse.json(
      { error: "Gagal menyiapkan ZIP. Coba sekali lagi ya." },
      { status: 500 },
    );
  }
  if (manifest.length === 0) {
    return NextResponse.json(
      { error: "Belum ada momen yang bisa diunduh." },
      { status: 400 },
    );
  }

  const threshold = format === "polaroid" ? POLAROID_SYNC_THRESHOLD : ORIGINAL_SYNC_THRESHOLD;
  if (manifest.length <= threshold) {
    try {
      const buffer = await createSynchronousZip(owned.event, format, manifest);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": String(buffer.byteLength),
          "Content-Disposition": `attachment; filename="temora-${owned.event.slug}-${format}.zip"`,
        },
      });
    } catch (error) {
      console.error("[zip.sync]", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "ZIP gagal dibuat." },
        { status: 500 },
      );
    }
  }

  const { jobId, status } = await createJob(admin, owned.event.id, {
    format,
    eventName: owned.event.name,
    manifest,
  });
  const advanced = await advanceJob(admin, {
    eventId: owned.event.id,
    jobId,
    slug: owned.event.slug,
  });
  return NextResponse.json({
    ok: true,
    jobId,
    ...publicZipStatus(advanced ?? status),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const jobId = new URL(request.url).searchParams.get("job");
  if (!jobId) return NextResponse.json({ error: "Job tidak dikenal." }, { status: 400 });
  const owned = await resolveOwnedEvent(eventId);
  if ("error" in owned) return ownedError(owned.error);

  const admin = createAdminClient();
  let status = await getStatus(admin, owned.event.id, jobId);
  if (!status) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });

  if (new URL(request.url).searchParams.get("download") === "1") {
    if (status.status !== "done") {
      return NextResponse.json({ error: "ZIP belum siap." }, { status: 409 });
    }
    const finalKey = `zips/${owned.event.id}/temora-${owned.event.slug}-${status.format}-${jobId}.zip`;
    try {
      const file = await downloadStorageFile(finalKey);
      return new NextResponse(file.bytes, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="temora-${owned.event.slug}-${status.format}.zip"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "ZIP sudah tidak tersedia." }, { status: 404 });
    }
  }

  if (status.status === "running") {
    status = await advanceJob(admin, {
      eventId: owned.event.id,
      jobId,
      slug: owned.event.slug,
    });
  }
  if (!status) return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true, jobId, ...publicZipStatus(status) });
}
