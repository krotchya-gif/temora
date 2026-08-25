"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) return;
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        needsEmailVerification?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? "Pendaftaran gagal. Coba sekali lagi.");
        return;
      }

      if (data.needsEmailVerification) {
        setAwaitingVerification(true);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Koneksi lagi ngambek. Coba sekali lagi?");
    } finally {
      setLoading(false);
    }
  }

  if (awaitingVerification) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center shadow-soft">
        <h2 className="font-display text-2xl text-text-primary">
          Cek email kamu ya
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          Kami kirim tautan verifikasi. Buka tautannya, lalu masuk untuk
          mulai bikin event pertamamu.
        </p>
        <Button href="/login" variant="secondary" className="mt-6 w-full">
          ke Halaman Masuk
        </Button>
      </div>
    );
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

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

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
    </form>
  );
}
