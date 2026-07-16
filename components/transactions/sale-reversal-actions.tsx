"use client";

import { useState, useTransition } from "react";
import { RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { refundCompletedSale, voidCompletedSale } from "@/lib/actions/sale-reversals";

function ReversalDialog({ saleId, saleNumber, kind }: { saleId: string; saleNumber: string; kind: "VOID" | "REFUND" }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition(); const isVoid = kind === "VOID";
  function submit() { setError(null); startTransition(async () => { const result = isVoid ? await voidCompletedSale(saleId, reason) : await refundCompletedSale(saleId, reason); if (result.success) { toast.success(isVoid ? "Transaksi dibatalkan." : "Refund penuh diselesaikan."); setOpen(false); } else setError(result.error ?? "Reversal gagal diproses."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant={isVoid ? "destructive" : "outline"}>{isVoid ? <XCircle className="size-4" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}{isVoid ? "Void" : "Refund Penuh"}</Button>} /><DialogContent><DialogHeader><DialogTitle>{isVoid ? "Void Transaksi" : "Refund Penuh"}</DialogTitle><DialogDescription>{saleNumber} akan direversal. Stok dikembalikan dan pembayaran dicatat dengan baris pembalik; data asli tidak dihapus.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`${kind}-${saleId}`}>Alasan</Label><Textarea id={`${kind}-${saleId}`} value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="button" variant={isVoid ? "destructive" : "default"} disabled={pending || reason.trim().length < 3} onClick={submit}>{pending ? "Memproses..." : isVoid ? "Konfirmasi Void" : "Konfirmasi Refund"}</Button></DialogFooter></DialogContent></Dialog>;
}

export function SaleReversalActions({ saleId, saleNumber }: { saleId: string; saleNumber: string }) { return <div className="flex flex-wrap gap-2"><ReversalDialog saleId={saleId} saleNumber={saleNumber} kind="REFUND" /><ReversalDialog saleId={saleId} saleNumber={saleNumber} kind="VOID" /></div>; }
