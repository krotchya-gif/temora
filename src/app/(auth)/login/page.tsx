import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard vendor TEMORA.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-text-primary">Selamat datang kembali</h1>
        <p className="text-sm text-text-secondary">
          Masuk untuk kelola event dan galeri fotomu.
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-text-secondary">
        Belum punya akun?{" "}
        <Link href="/signup" className="font-medium text-accent hover:text-accent-hover">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
