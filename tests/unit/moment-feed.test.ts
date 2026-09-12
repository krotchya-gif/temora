import { describe, expect, it } from "vitest";
import {
  decodeMomentCursor,
  encodeMomentCursor,
  mergeMomentFeedItems,
  type MomentFeedItem,
} from "@/lib/moment-feed";

function item(id: string, kind: "photo" | "moment", occurredAt: string): MomentFeedItem {
  return {
    id,
    kind,
    occurredAt,
    photoId: kind === "photo" ? id : null,
    momentId: kind === "moment" ? id : null,
    thumbUrl: null,
    tableLabel: null,
    caption: null,
    isHidden: false,
  };
}

describe("moment feed cursor", () => {
  it("round-trip waktu dan UUID", () => {
    const cursor = {
      occurredAt: "2026-09-12T08:30:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
    };
    expect(decodeMomentCursor(encodeMomentCursor(cursor))).toEqual(cursor);
  });

  it.each(["bukan-base64", "e30", "eyJvY2N1cnJlZEF0IjoieCJ9"])(
    "menolak cursor invalid: %s",
    (value) => expect(decodeMomentCursor(value)).toBeNull(),
  );

  it("menggabungkan dua stream secara kronologis dan stabil untuk cursor", () => {
    const result = mergeMomentFeedItems(
      [item("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "moment", "2026-09-12T09:00:00Z")],
      [
        item("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "photo", "2026-09-12T10:00:00Z"),
        item("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "photo", "2026-09-12T09:00:00Z"),
      ],
      2,
    );

    expect(result.hasMore).toBe(true);
    expect(result.items.map(({ id }) => id)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ]);
    const last = result.items.at(-1)!;
    expect(decodeMomentCursor(encodeMomentCursor({ occurredAt: last.occurredAt, id: last.id }))).toEqual({
      occurredAt: "2026-09-12T09:00:00Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
  });
});
