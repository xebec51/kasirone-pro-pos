"use client";

import { useState, useTransition } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recordDebtPayment } from "@/lib/actions/debts";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { PAYMENT_METHOD_LABELS } from "@/lib/pos/labels";

const METHODS = ["CASH", "BANK_TRANSFER", "QRIS_MANUAL", "DEBIT", "CREDIT", "E_WALLET_MANUAL", "OTHER"];
export function DebtPaymentDialog({ customerId, customerName, currentDebt }: { customerId: string; customerName: string; currentDebt: number }) {
  const [open, setOpen] = useState(false); const [method, setMethod] = useState("CASH"); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function submit(data: FormData) { setError(null); startTransition(async () => { const result = await recordDebtPayment(customerId, { success: false }, data); if (result.success) { toast.success("Pembayaran utang dicatat."); setOpen(false); } else setError(result.error ?? "Pembayaran gagal diproses."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button><HandCoins className="size-4" aria-hidden="true" />Bayar Utang</Button>} /><DialogContent><DialogHeader><DialogTitle>Pembayaran Utang</DialogTitle><DialogDescription>{customerName} memiliki utang {formatCurrencyIDR(currentDebt)}.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="debt-amount">Jumlah (Rp)</Label><Input id="debt-amount" name="amount" type="number" min={1} max={currentDebt} step="1" defaultValue={currentDebt} required /></div><div className="space-y-2"><Label htmlFor="debt-method">Metode</Label><Select name="method" value={method} onValueChange={(value) => setMethod(value || "CASH")}><SelectTrigger id="debt-method" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{METHODS.map((value) => <SelectItem key={value} value={value}>{PAYMENT_METHOD_LABELS[value] ?? value}</SelectItem>)}</SelectContent></Select></div>{method !== "CASH" ? <div className="space-y-2"><Label htmlFor="debt-reference">Referensi</Label><Input id="debt-reference" name="reference" maxLength={150} /></div> : null}<div className="space-y-2"><Label htmlFor="debt-notes">Catatan</Label><Textarea id="debt-notes" name="notes" maxLength={500} /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={pending}>{pending ? "Memproses..." : "Simpan Pembayaran"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
