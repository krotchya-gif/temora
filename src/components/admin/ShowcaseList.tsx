"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ShowcaseItem = {
  id: string;
  url: string;
  title: string;
  caption: string | null;
};

type ShowcaseListProps = {
  items: ShowcaseItem[];
};

type EditDraft = {
  title: string;
  caption: string;
  file: File | null;
  previewUrl: string | null;
};

type Feedback = { kind: "ok" | "error"; message: string };

export function ShowcaseList({ items }: ShowcaseListProps) {
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const router = useRouter();

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      for (const previewUrl of previewUrls) URL.revokeObjectURL(previewUrl);
      previewUrls.clear();
    };
  }, []);

  const editOf = (item: ShowcaseItem): EditDraft =>
    edits[item.id] ?? {
      title: item.title,
      caption: item.caption ?? "",
      file: null,
      previewUrl: null,
    };

  function setEdit(item: ShowcaseItem, patch: Partial<EditDraft>) {
    setEdits((previous) => {
      const current = previous[item.id] ?? editOf(item);
      return { ...previous, [item.id]: { ...current, ...patch } };
    });
    setFeedback((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });
  }

  function chooseImage(item: ShowcaseItem, file: File | undefined) {
    if (!file) return;
    const validType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      /\.(jpe?g|png)$/i.test(file.name);
    if (!validType || file.size < 1024 || file.size > 10 * 1024 * 1024) {
      setFeedback((previous) => ({
        ...previous,
        [item.id]: {
          kind: "error",
          message: "Pilih JPEG/PNG berukuran 1KB–10MB.",
        },
      }));
      return;
    }

    const current = editOf(item);
    if (current.previewUrl) {
      URL.revokeObjectURL(current.previewUrl);
      previewUrlsRef.current.delete(current.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    setEdit(item, { file, previewUrl });
  }

  async function save(item: ShowcaseItem) {
    const edit = editOf(item);
    if (edit.title.trim().length < 2) {
      setFeedback((previous) => ({
        ...previous,
        [item.id]: { kind: "error", message: "Judul minimal 2 karakter." },
      }));
      return;
    }

    setBusyId(item.id);
    setFeedback((previous) => {
      const next = { ...previous };
      delete next[item.id];
      return next;
    });

    const form = new FormData();
    form.set("title", edit.title.trim());
    form.set("caption", edit.caption.trim());
    if (edit.file) form.set("file", edit.file);

    try {
      const response = await fetch(`/api/admin/showcase/${item.id}`, {
        method: "PATCH",
        body: form,
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        warning?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Perubahan gagal disimpan.");
      }

      setEdits((previous) => ({
        ...previous,
        [item.id]: { ...edit, file: null },
      }));
      setFeedback((previous) => ({
        ...previous,
        [item.id]: {
          kind: "ok",
          message: body.warning ?? "Gambar, judul, dan kutipan sudah diperbarui.",
        },
      }));
      router.refresh();
    } catch (error) {
      setFeedback((previous) => ({
        ...previous,
        [item.id]: {
          kind: "error",
          message: error instanceof Error ? error.message : "Perubahan gagal disimpan.",
        },
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function call(url: string, method: string, itemId: string, body?: unknown) {
    setBusyId(itemId);
    setFeedback((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Aksi gagal dijalankan.");
      router.refresh();
    } catch (error) {
      setFeedback((previous) => ({
        ...previous,
        [itemId]: {
          kind: "error",
          message: error instanceof Error ? error.message : "Aksi gagal dijalankan.",
        },
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function move(id: string, direction: "up" | "down") {
    await call("/api/admin/showcase/reorder", "POST", id, { photoId: id, direction });
  }

  async function remove(item: ShowcaseItem) {
    if (!window.confirm(`Hapus "${item.title}" dari showcase?`)) return;
    await call(`/api/admin/showcase/${item.id}`, "DELETE", item.id);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-bg-card px-6 py-10 text-center text-sm text-text-secondary">
        Belum ada foto. Upload pertama lewat formulir di atas.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item, index) => {
        const edit = editOf(item);
        const dirty =
          Boolean(edit.file) ||
          edit.title !== item.title ||
          edit.caption !== (item.caption ?? "");
        const status = feedback[item.id];

        return (
          <li
            key={item.id}
            className="grid gap-4 rounded-xl border border-border bg-bg-card p-4 lg:grid-cols-[12rem_minmax(0,1fr)_auto] lg:items-start"
          >
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview dapat berupa object URL lokal */}
              <img
                src={edit.previewUrl ?? item.url}
                alt={`Preview ${edit.title || item.title}`}
                className="aspect-[4/3] w-full rounded-lg bg-bg-warm object-cover"
              />
              <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent/30 px-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-within:ring-2 focus-within:ring-dusty-blue motion-reduce:transition-none">
                <ImagePlus className="h-4 w-4" aria-hidden />
                {edit.file ? "Pilih foto lain" : "Ganti foto"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  className="sr-only"
                  aria-label={`Ganti foto ${item.title}`}
                  onChange={(event) => {
                    chooseImage(item, event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {edit.file ? (
                <p className="break-all text-xs text-text-secondary">{edit.file.name}</p>
              ) : null}
            </div>

            <div className="min-w-0 space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-text-secondary">Judul</span>
                <input
                  value={edit.title}
                  onChange={(event) => setEdit(item, { title: event.target.value })}
                  minLength={2}
                  maxLength={120}
                  required
                  className="min-h-11 w-full rounded-lg border border-border bg-bg-base px-3 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-text-secondary">Kutipan</span>
                <textarea
                  value={edit.caption}
                  onChange={(event) => setEdit(item, { caption: event.target.value })}
                  maxLength={280}
                  rows={3}
                  placeholder="Kutipan singkat (opsional)"
                  className="w-full resize-y rounded-lg border border-border bg-bg-base px-3 py-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
                />
              </label>
              <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                <span>{dirty ? "Ada perubahan belum disimpan" : "Tidak ada perubahan"}</span>
                <span>{edit.caption.length}/280</span>
              </div>
              {status ? (
                <p
                  role="status"
                  className={status.kind === "ok" ? "text-sm text-success" : "text-sm text-danger"}
                >
                  {status.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:max-w-48 lg:justify-end">
              <button
                type="button"
                aria-label="Naikkan urutan"
                disabled={busyId === item.id || index === 0}
                onClick={() => void move(item.id, "up")}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-bg-warm disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Turunkan urutan"
                disabled={busyId === item.id || index === items.length - 1}
                onClick={() => void move(item.id, "down")}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-bg-warm disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <Button
                size="sm"
                className="min-w-32 flex-1 lg:flex-none"
                onClick={() => void save(item)}
                disabled={busyId === item.id || !dirty}
              >
                {busyId === item.id ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
              <button
                type="button"
                aria-label={`Hapus ${item.title}`}
                disabled={busyId === item.id}
                onClick={() => void remove(item)}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
