"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    // Auth wiring — task 003 (Supabase)
    window.setTimeout(() => setLoading(false), 600);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Memproses…" : "Masuk"}
      </Button>

      <p className="rounded-lg border border-border bg-bg-warm px-3 py-2 text-xs leading-relaxed text-text-secondary">
        Form sudah siap. Koneksi ke Supabase Auth dikerjakan di task 003.
      </p>
    </form>
  );
}
