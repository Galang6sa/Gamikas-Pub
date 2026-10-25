import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Kunci anon (publishable) memang boleh ada di aplikasi. Keamanan data dijaga RLS di database.
// Jangan pernah memasukkan kunci rahasia (service_role atau secret) ke sini atau ke variabel NEXT_PUBLIC_*.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN ?? "student.pens.ac.id";
export const QRIS_IMAGE = process.env.NEXT_PUBLIC_QRIS_IMAGE ?? "/qris.jpeg";
export const isLive = url.startsWith("https://") && anonKey.length > 20;

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  if (!isLive) throw new Error("Supabase belum dikonfigurasi.");
  client ??= createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export const emailSiswa = (nrp: string) => `${nrp}@${EMAIL_DOMAIN}`;
