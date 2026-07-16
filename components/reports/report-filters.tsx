"use client";

import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReportFilters({ from, to }: { from: string; to: string }) {
  const router = useRouter(); const pathname = usePathname();
  function update(key: "from" | "to", value: string) { const params = new URLSearchParams({ from, to }); params.set(key, value); router.replace(`${pathname}?${params.toString()}`); }
  return <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end"><div className="space-y-2"><Label htmlFor="report-from">Dari tanggal</Label><Input id="report-from" type="date" defaultValue={from} onChange={(event) => update("from", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="report-to">Sampai tanggal</Label><Input id="report-to" type="date" defaultValue={to} onChange={(event) => update("to", event.target.value)} /></div><p className="text-sm text-muted-foreground">Semua ringkasan dan ekspor bertanggal mengikuti rentang ini.</p></div>;
}
