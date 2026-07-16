"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ShiftFilters({ cashiers, showCashier }: { cashiers: { id: string; name: string }[]; showCashier: boolean }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  function updateParam(key: string, value: string) { const params = new URLSearchParams(searchParams.toString()); if (value) params.set(key, value); else params.delete(key); params.delete("page"); router.replace(`${pathname}?${params.toString()}`); }
  return <div className="flex flex-col gap-3 sm:flex-row"><Select defaultValue={searchParams.get("status") ?? "all"} onValueChange={(value) => updateParam("status", value && value !== "all" ? value : "")}><SelectTrigger aria-label="Filter status shift"><SelectValue placeholder="Semua status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="OPEN">Terbuka</SelectItem><SelectItem value="CLOSED">Ditutup</SelectItem></SelectContent></Select>{showCashier ? <Select defaultValue={searchParams.get("cashierId") ?? "all"} onValueChange={(value) => updateParam("cashierId", value && value !== "all" ? value : "")}><SelectTrigger aria-label="Filter operator"><SelectValue placeholder="Semua operator" /></SelectTrigger><SelectContent><SelectItem value="all">Semua operator</SelectItem>{cashiers.map((cashier) => <SelectItem key={cashier.id} value={cashier.id}>{cashier.name}</SelectItem>)}</SelectContent></Select> : null}</div>;
}
