"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getReportExport } from "@/lib/actions/reports";

const EXPORTS = [{ type: "sales", label: "Penjualan" }, { type: "products", label: "Produk" }, { type: "shifts", label: "Shift" }, { type: "stock", label: "Kartu Stok" }, { type: "debts", label: "Utang Pelanggan" }];
export function ExportButtons({ from, to }: { from: string; to: string }) {
  const [pending, setPending] = useState<string | null>(null);
  async function exportFile(type: string) {
    setPending(type);
    try {
      const result = await getReportExport(type, from, to);
      if (!result.success || !result.rows || !result.filename || !result.sheetName) { toast.error(result.error ?? "Ekspor gagal."); return; }
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(result.rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, result.sheetName.slice(0, 31));
      XLSX.writeFile(workbook, result.filename);
      toast.success(`${result.rows.length} baris diekspor.`);
    } catch { toast.error("Berkas XLSX gagal dibuat."); } finally { setPending(null); }
  }
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline"><Download className="size-4" aria-hidden="true" />{pending ? "Menyiapkan..." : "Ekspor XLSX"}</Button>} /><DropdownMenuContent align="end">{EXPORTS.map((item) => <DropdownMenuItem key={item.type} disabled={Boolean(pending)} onClick={() => exportFile(item.type)}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
