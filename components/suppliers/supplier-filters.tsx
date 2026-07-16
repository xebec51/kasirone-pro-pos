"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SupplierFilters() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function updateParam(key: string, value: string) { const params = new URLSearchParams(searchParams.toString()); if (value) params.set(key, value); else params.delete(key); params.delete("page"); router.replace(`${pathname}?${params.toString()}`); }
  function handleSearch(value: string) { if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = setTimeout(() => updateParam("q", value), 350); }
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input defaultValue={searchParams.get("q") ?? ""} onChange={(event) => handleSearch(event.target.value)} placeholder="Cari nama, kontak, telepon, atau email" className="pl-8" aria-label="Cari supplier" /></div><Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(value) => updateParam("status", value && value !== "all" ? value : "")}><SelectTrigger aria-label="Filter status supplier"><SelectValue placeholder="Semua status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Tidak Aktif</SelectItem></SelectContent></Select></div>;
}
