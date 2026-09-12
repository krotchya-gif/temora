import { describe, expect, it } from "vitest";
import { composePolaroidExportItems } from "@/lib/moment-export";

const photos = [
  { id: "photo-a", storage_path: "events/a.jpg", taken_at: "2026-09-12T08:00:00Z" },
  { id: "photo-b", storage_path: "events/b.jpg", taken_at: "2026-09-12T07:00:00Z" },
];

describe("composePolaroidExportItems", () => {
  it("mempertahankan beberapa caption pada foto yang sama dan moment tanpa foto", () => {
    const items = composePolaroidExportItems(photos, [
      { id: "moment-1", photo_id: "photo-a", content: "Pertama", created_at: "2026-09-12T10:00:00Z", is_hidden: false },
      { id: "moment-2", photo_id: "photo-a", content: "Kedua", created_at: "2026-09-12T09:00:00Z", is_hidden: false },
      { id: "moment-3", photo_id: null, content: "Pesan saja", created_at: "2026-09-12T08:30:00Z", is_hidden: false },
    ]);

    expect(items.map((item) => item.id)).toEqual(["moment-1", "moment-2", "moment-3", "photo-b"]);
    expect(items.filter((item) => item.photoId === "photo-a")).toHaveLength(2);
    expect(items.find((item) => item.id === "moment-3")?.storagePath).toBeNull();
  });

  it("menghapus caption hidden tetapi tetap menyertakan foto aktif tanpa caption", () => {
    const items = composePolaroidExportItems([photos[0]], [
      { id: "hidden", photo_id: "photo-a", content: "Rahasia", created_at: "2026-09-12T10:00:00Z", is_hidden: true },
    ]);

    expect(items).toEqual([
      expect.objectContaining({ id: "photo-a", caption: null, storagePath: "events/a.jpg" }),
    ]);
  });
});
