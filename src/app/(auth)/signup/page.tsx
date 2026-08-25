import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun vendor TEMORA gratis.",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl text-text-primary">Buat akun vendor</h1>
        <p className="text-sm text-text-secondary">
          Gratis untuk satu event aktif, upgrade kapan saja.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-text-secondary">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Masuk
        </Link>
      </p>
    </div>
  );
}
