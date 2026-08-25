import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
};

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl text-text-primary">Kebijakan Privasi</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          Dokumen lengkap menyusul task 015. Ringkas: tamu anonim di MVP, foto
          memiliki TTL auto-delete, tanpa facial recognition. Detail di docs/database.md §7.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-accent hover:text-accent-hover">
          ← Kembali ke beranda
        </Link>
      </article>
    </MarketingLayout>
  );
}
