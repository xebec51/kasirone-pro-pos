import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { KasironeLogo } from "@/components/brand/kasirone-logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Akses Ditolak",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
      <Link href="/" aria-label="Ke beranda KasirOne Pro">
        <KasironeLogo />
      </Link>
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Akses Ditolak</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Akun Anda tidak memiliki izin untuk mengakses halaman ini. Akun mungkin
          tidak aktif, belum terdaftar sebagai anggota toko, atau perannya tidak
          mengizinkan halaman ini.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/dashboard" />}>Ke Dashboard</Button>
        <Button variant="outline" render={<Link href="/login" />}>
          Ganti Akun
        </Button>
      </div>
    </div>
  );
}
