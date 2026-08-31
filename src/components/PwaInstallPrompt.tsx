"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Install prompt PWA (architecture.md §13.3): muncul sekali — kalau user
// dismiss ("Nanti Saja"), tersimpan di localStorage dan tidak muncul lagi.
// Microcopy dari design-system §6.
const DISMISSED_KEY = "temora_pwa_dismissed";
const INSTALLED_KEY = "temora_pwa_installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS: berjalan dari Layar Utama.
    "standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // iOS tidak punya beforeinstallprompt: tampilkan instruksi manual sekali,
  // selama belum pernah dismiss/terinstall (architecture.md §13.3).
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return false;
    if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(INSTALLED_KEY)) return false;
    return isIos();
  });

  // Daftarkan service worker sekali di sisi client.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(INSTALLED_KEY)) {
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    }
  };

  const isPhotobooth = pathname.startsWith("/p/");
  const show = visible && !isPhotobooth && !isStandalone();

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install aplikasi TEMORA"
      className="fixed inset-x-4 bottom-4 z-50 animate-fade-up rounded-xl border border-border bg-bg-card p-4 shadow-card sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-dusty-blue/15 text-dusty-blue">
          <Smartphone aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">Simpan TEMORA di layar utama</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {deferred
              ? "Buka cepat, momen tetap dekat. Tanpa perlu unduh aplikasi."
              : "Ketuk ikon bagikan lalu pilih \u2018Tambahkan ke Layar Utama\u2019."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Nanti Saja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}