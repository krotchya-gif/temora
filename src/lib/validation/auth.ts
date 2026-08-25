import { z } from "zod";

/**
 * Pesan error auth versi manusia (task 003 §7): tanpa istilah teknis mentah.
 */
export function humanAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Email atau kata sandi belum pas.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Email kamu belum diverifikasi. Cek inbox ya.";
  }
  if (/already registered|already exists/i.test(message)) {
    return "Email ini sudah terdaftar. Coba masuk saja.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Terlalu banyak percobaan. Coba lagi beberapa menit.";
  }
  if (/password.*least|short/i.test(message)) {
    return "Kata sandi minimal 8 karakter.";
  }
  return "Ada yang salah di server kami. Coba beberapa saat lagi.";
}

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().email("Format email belum benar"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Format email belum benar"),
  password: z.string().min(1, "Kata sandi wajib diisi").max(72),
});
