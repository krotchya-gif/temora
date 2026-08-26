"use client";

import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/tracking";

// CTA WhatsApp landing — catat event konversi marketing (tab Event Monitor).
export function TrackedWaCta({ href }: { href: string }) {
  return (
    <Button href={href} size="lg" onClick={() => void trackEvent("wa_click", "mulai_via_whatsapp", "/")}>
      Mulai via WhatsApp
    </Button>
  );
}