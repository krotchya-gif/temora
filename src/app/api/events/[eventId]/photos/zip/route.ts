import JSZip from "jszip";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import {
  advanceJob,
  createJob,
  getStatus,
  type ZipJobStatus,
} from "@/lib/zip-job";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYNC_THRESHOLD = 100; // task 006 §4.1

type OwnedResult =
  | { error: "auth" | "notfound" }
  | { event: { id: string; slug: string } };

async function resolveOwnedEvent(eventId: string): Promise<OwnedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };

  // RLS p_owner_all: event vendor lain tidak terlihat.
  const { data: event } = await supabase
    .from("events")
    .select("id, slug")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "notfound" };
  return { event };
}

// POST — mulai unduh ZIP: ≤100 foto langsung di-stream; >100 job resumable.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const owned = await resolveOwnedEvent(eventId);
  if ("error" in owned) {
    return NextResponse.json(
      {
        error:
          owned.error === "auth"
            ? "Silakan login dulu."
            : "Event tidak ditemukan.",
      },
      { status: owned.error === "auth" ? 401 : 404 },
    );
  }

  const admin = createAdminClient();

  // ZIP berat (buffering RAM) — meter ketat per event (task 019).
  if (!allowRequest(`zip:${owned.event.id}`, 2)) {
    return NextResponse.json(
      { error: "Unduhan ZIP sedang diproses. Tunggu sebentar ya." },
      { status: 429 },
    );
  }

  const { count, error: countError } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", owned.event.id)
    .is("deleted_at", null);

  if (countError) {
    console.error("[zip.count]", countError.message);
    return NextResponse.json(
      { error: "Gagal menyiapkan ZIP. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  const total = count ?? 0;
  if (total === 0) {
    return NextResponse.json(
      { error: "Belum ada momen yang bisa diunduh." },
      { status: 400 },
    );
  }

  // ---- Jalur sinkron: stream ZIP langsung dari request ----
  if (total <= SYNC_THRESHOLD) {
    const { data: rows, error } = await admin
      .from("photos")
      .select("storage_path")
      .eq("event_id", owned.event.id)
      .is("deleted_at", null)
      .order("taken_at", { ascending: false });
    if (error) {
      console.error("[zip.sync.query]", error.message);
      return NextResponse.json(
        { error: "Gagal menyiapkan ZIP. Coba sekali lagi ya." },
        { status: 500 },
      );
    }

    const zip = new JSZip();
    for (const [i, row] of (rows ?? []).entries()) {
      const { data: blob, error: dlError } = await admin.storage
        .from("photos")
        .download(row.storage_path);
      if (dlError || !blob) continue;
      zip.file(`momen-${String(i + 1).padStart(4, "0")}.jpg`, await blob.arrayBuffer());
    }

    // JPEG sudah terkompres — STORE cepat tanpa overhead CPU.
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename="temora-${owned.event.slug}.zip"`,
      },
    });
  }

  // ---- Jalur background: chunk pertama diproses sekarang, sisanya via polling ----
  const { jobId, status } = await createJob(admin, owned.event.id, total);
  const advanced = await advanceJob(admin, {
    eventId: owned.event.id,
    jobId,
    slug: owned.event.slug,
  });

  return NextResponse.json({ ok: true, jobId, ...(advanced ?? status) });
}

// GET ?job={jobId} — polling progres; tiap panggilan memajukan job satu chunk.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const jobId = new URL(request.url).searchParams.get("job");
  if (!jobId) {
    return NextResponse.json({ error: "Job tidak dikenal." }, { status: 400 });
  }

  const owned = await resolveOwnedEvent(eventId);
  if ("error" in owned) {
    return NextResponse.json(
      {
        error:
          owned.error === "auth"
            ? "Silakan login dulu."
            : "Event tidak ditemukan.",
      },
      { status: owned.error === "auth" ? 401 : 404 },
    );
  }

  const admin = createAdminClient();
  let status: ZipJobStatus | null = await getStatus(
    admin,
    owned.event.id,
    jobId,
  );
  if (!status) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }

  if (status.status === "running") {
    status = await advanceJob(admin, {
      eventId: owned.event.id,
      jobId,
      slug: owned.event.slug,
    });
  }

  return NextResponse.json({ ok: true, jobId, ...status });
}
