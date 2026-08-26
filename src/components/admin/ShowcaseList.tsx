"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export type ShowcaseItem = {
  id: string;
  storagePath: string;
  title: string;
  caption: string | null;
};

type ShowcaseListProps = {
  items: ShowcaseItem[];
  publicBase: string; // NEXT_PUBLIC_SUPABASE_URL
};

export function ShowcaseList({ items, publicBase }: ShowcaseListProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, { title: string; caption: string }>>(
    Object.fromEntries(
      items.map((it) => [
        it.id,
        { title: it.title, caption: it.caption ?? "" },
      ]),
    ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  }

  async function save(item: ShowcaseItem) {
    const edit = edits[item.id];
    setBusyId(item.id);
    await call(`/api/admin/showcase/${item.id}`, "PATCH", {
      title: edit.title,
      caption: edit.caption || null,
    });
    setBusyId(null);
    router.refresh();
  }

  async function move(id: string, direction: "up" | "down") {
    setBusyId(id);
    await call("/api/admin/showcase/reorder", "POST", { photoId: id, direction });
    setBusyId(null);
    router.refresh();
  }

  async function remove(item: ShowcaseItem) {
    if (!window.confirm(`Hapus "${item.title}" dari showcase?`)) return;
    setBusyId(item.id);
    await call(`/api/admin/showcase/${item.id}`, "DELETE");
    setBusyId(null);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center text-sm text-text-secondary">
        Belum ada foto. Upload pertama lewat formulir di atas.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const edit = edits[item.id];
        return (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg-card p-3 sm:flex-row sm:items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail publik statis */}
            <img
              src={`${publicBase}/storage/v1/object/public/${item.storagePath}`}
              alt={item.title}
              className="h-20 w-28 shrink-0 rounded-lg bg-bg-warm object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={edit.title}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [item.id]: { ...edit, title: e.target.value },
                  }))
                }
                maxLength={120}
                aria-label={`Judul ${item.title}`}
                className="w-full rounded-lg border border-border bg-bg-base px-3 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
              />
              <input
                value={edit.caption}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [item.id]: { ...edit, caption: e.target.value },
                  }))
                }
                maxLength={280}
                placeholder="Kutipan singkat (opsional)"
                aria-label={`Kutipan ${item.title}`}
                className="w-full rounded-lg border border-border bg-bg-base px-3 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
              <button
                type="button"
                aria-label="Naikkan urutan"
                disabled={busyId === item.id || index === 0}
                onClick={() => void move(item.id, "up")}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-bg-warm disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Turunkan urutan"
                disabled={busyId === item.id || index === items.length - 1}
                onClick={() => void move(item.id, "down")}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-bg-warm disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void save(item)}
                disabled={busyId === item.id}
                className="min-h-9 rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
              >
                Simpan
              </button>
              <button
                type="button"
                aria-label={`Hapus ${item.title}`}
                disabled={busyId === item.id}
                onClick={() => void remove(item)}
                className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
