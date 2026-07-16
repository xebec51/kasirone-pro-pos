import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { KasironeLogo } from "@/components/brand/kasirone-logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" aria-label="Ke beranda KasirOne Pro">
            <KasironeLogo />
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Masuk ke KasirOne Pro</h1>
            <p className="text-sm text-muted-foreground">
              Kelola kasir, stok, dan laporan toko Anda.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-foreground hover:underline">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
