"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markReceiptPrinted } from "@/lib/actions/receipts";

export function ReceiptActions({ saleId }: { saleId: string }) {
  const [pending, startTransition] = useTransition();
  function print() { startTransition(async () => { const result = await markReceiptPrinted(saleId); if (!result.success) { toast.error(result.error ?? "Struk gagal disiapkan."); return; } window.print(); }); }
  return <Button type="button" onClick={print} disabled={pending}><Printer className="size-4" aria-hidden="true" />{pending ? "Menyiapkan..." : "Cetak Ulang"}</Button>;
}
