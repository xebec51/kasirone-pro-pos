"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelHeldSale } from "@/lib/actions/pos";

export function CancelHeldSaleButton({ id, saleNumber }: { id: string; saleNumber: string }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function submit() { setError(null); startTransition(async () => { const result = await cancelHeldSale(id, reason); if (result.success) { toast.success(`Transaksi ${saleNumber} dibatalkan.`); setOpen(false); } else setError(result.error ?? "Gagal membatalkan transaksi."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button size="sm" variant="outline">Batalkan</Button>} /><DialogContent><DialogHeader><DialogTitle>Batalkan Transaksi Ditahan</DialogTitle><DialogDescription>Transaksi {saleNumber} belum mengubah stok dan akan ditandai dibatalkan.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`cancel-${id}`}>Alasan</Label><Textarea id={`cancel-${id}`} value={reason} onChange={(event) => setReason(event.target.value)} minLength={2} maxLength={500} required /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="button" variant="destructive" disabled={pending || reason.trim().length < 2} onClick={submit}>{pending ? "Membatalkan..." : "Batalkan"}</Button></DialogFooter></DialogContent></Dialog>;
}
