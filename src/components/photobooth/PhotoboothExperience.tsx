"use client";

import { useCallback, useEffect, useState } from "react";
import { ConsentScreen } from "@/components/photobooth/ConsentScreen";
import { CoverScreen } from "@/components/photobooth/CoverScreen";
import { CameraStage } from "@/components/photobooth/CameraStage";
import { themeAccent, type PhotoboothEvent } from "@/lib/events";

type PhotoboothExperienceProps = {
  event: PhotoboothEvent;
  tableId: string;
  tableLabel: string;
  /** Sisa kuota foto event; null = unlimited. */
  remaining: number | null;
  /** Sponsor aktif posisi frame (task 013) — consent + logo di hasil foto. */
  frameSponsors: { id: string; name: string; logo_path: string | null }[];
};

export function PhotoboothExperience({
  event,
  tableId,
  tableLabel,
  remaining,
  frameSponsors,
}: PhotoboothExperienceProps) {
  const [consented, setConsented] = useState(false);
  const [coverSeen, setCoverSeen] = useState(false);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(
    null,
  );

  const showToast = useCallback((message: string) => {
    setToast({ key: Date.now(), message });
  }, []);

  // Toast auto-hide (design-system §10: sync diam-diam, tanpa blokir).
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2_600);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAccept = useCallback(() => {
    // scan_count maks 1× per sesi buka halaman (task 004 §2).
    const sessionKey = `temora-scan-${tableId}`;
    try {
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        void fetch(`/api/events/${event.id}/tables/${tableId}/scan`, {
          method: "POST",
        }).catch(() => undefined);
      }
    } catch {
      // sessionStorage bisa gagal di mode privat — jangan blok tamu.
    }
    setConsented(true);
  }, [event.id, tableId]);

  return (
    <div style={{ "--event-accent": themeAccent(event.theme) } as React.CSSProperties}>
      {!coverSeen ? (
        <CoverScreen event={event} onContinue={() => setCoverSeen(true)} />
      ) : consented ? (
        <CameraStage
          eventId={event.id}
          eventName={event.name}
          tableId={tableId}
          tableLabel={tableLabel}
          frameUrl={event.frameUrl}
          watermarkText={event.watermarkText}
          watermarkPosition={event.watermarkPosition}
          remaining={remaining}
          frameSponsors={frameSponsors}
          onToast={showToast}
        />
      ) : (
        <ConsentScreen
          eventName={event.name}
          tableLabel={tableLabel}
          sponsorNames={frameSponsors.map((s) => s.name)}
          onAccept={handleAccept}
        />
      )}

      {toast ? (
        <div
          key={toast.key}
          role="status"
          className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-lg bg-text-primary px-4 py-3 text-center text-sm text-white shadow-card"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
