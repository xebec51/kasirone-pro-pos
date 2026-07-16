"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Halaman gagal dimuat</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Terjadi kendala saat mengambil data. Coba muat ulang halaman ini.
        </p>
        <Button type="button" className="mt-5" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
