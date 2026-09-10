"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export type ShowcaseItem = {
  id: string;
  url: string;
  title: string;
  caption: string | null;
};

type ShowcaseListProps = {
  items: ShowcaseItem[];
};

export function ShowcaseList({ items }: ShowcaseListProps) {
  // Draft edit per bari disimpan dengan fallback ke props — foto baru hasil
  // router.refresh() tidak punya entri lama dan tidak boleh crash (bugfix).
  const [edits, setEdits] = useState<
    Record<string, { title: string; caption: string }>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  const editOf = (item: ShowcaseItem) =>
    edits[item.id] ?? { title: item.title, caption: item.caption ?? "" };

  const setEdit = (item: ShowcaseItem, patch: Partial<{ title: string; caption: string }>) =>
    setEdits((prev) => ({
      ...prev,
      [item.id]: {
        title: patch.title ?? editOf(item).title,
        caption: patch.caption ?? editOf(item).caption,
      },
    }));

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  }

  async function save(item: ShowcaseItem) {
    setBusyId(item.id);
    await call(`/api/admin/showcase/${item.id}`, "PATCH", {
      title: editOf(item).title,
      caption: editOf(item).caption || null,
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
        const edit = editOf(item);
        return (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-bg-card p-3 sm:flex-row sm:items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail publik statis */}
            <img
              src={item.url}
              alt={item.title}
              className="h-20 w-28 shrink-0 rounded-lg bg-bg-warm object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={edit.title}
                onChange={(e) =>
                  setEdit(item, { title: e.target.value })
                }
                maxLength={120}
                aria-label={`Judul ${item.title}`}
                className="w-full rounded-lg border border-border bg-bg-base px-3 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
              />
              <input
                value={edit.caption}
                onChange={(e) =>
                  setEdit(item, { caption: e.target.value })
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
                className="min-h-11 rounded-lg border border-accent/30 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
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
