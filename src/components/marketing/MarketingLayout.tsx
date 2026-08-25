"use client";

import { useState } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen((open) => !open)}
      />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
