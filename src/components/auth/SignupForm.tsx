"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) return;
    setLoading(true);
    window.setTimeout(() => setLoading(false), 600);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nama"
        name="name"
        autoComplete="name"
        placeholder="Nama kamu"
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="nama@contoh.com"
        required
      />
      <Input
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Minimal 8 karakter"
        minLength={8}
        required
      />

      <label className="flex items-start gap-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-dusty-blue"
          required
        />
        <span>
          Saya setuju dengan{" "}
          <Link href="/terms" className="text-accent hover:text-accent-hover">
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link href="/privacy" className="text-accent hover:text-accent-hover">
            Kebijakan Privasi
          </Link>
          .
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={loading || !accepted}>
        {loading ? "Memproses…" : "Daftar Gratis"}
      </Button>

      <p className="rounded-lg border border-border bg-bg-warm px-3 py-2 text-xs leading-relaxed text-text-secondary">
        Form sudah siap. Koneksi ke Supabase Auth dikerjakan di task 003.
      </p>
    </form>
  );
}
