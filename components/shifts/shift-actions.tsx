"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine, LockKeyhole, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCashMovement, closeShift, openShift } from "@/lib/actions/shifts";
import { formatCurrencyIDR } from "@/lib/pos/currency";

export function OpenShiftDialog({ activeShift }: { activeShift: { id: string; openedAt: string } | null }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  if (activeShift) return <Button render={<Link href={`/dashboard/shifts/${activeShift.id}`} />}><Play className="size-4" aria-hidden="true" />Shift Aktif</Button>;
  function submit(formData: FormData) { setError(null); startTransition(async () => { const result = await openShift({ success: false }, formData); if (result.success) { toast.success("Shift dibuka."); setOpen(false); } else setError(result.error ?? "Gagal membuka shift."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button><Play className="size-4" aria-hidden="true" />Buka Shift</Button>} /><DialogContent><DialogHeader><DialogTitle>Buka Shift</DialogTitle><DialogDescription>Masukkan jumlah uang tunai awal di laci kas.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="openingCash">Modal awal (Rp)</Label><Input id="openingCash" name="openingCash" type="number" min={0} step="1" defaultValue={0} required /></div><div className="space-y-2"><Label htmlFor="openingNotes">Catatan (opsional)</Label><Textarea id="openingNotes" name="notes" maxLength={1000} /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={pending}>{pending ? "Membuka..." : "Buka Shift"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function CashMovementDialog({ shiftId, type }: { shiftId: string; type: "CASH_IN" | "CASH_OUT" }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition(); const incoming = type === "CASH_IN";
  function submit(formData: FormData) { setError(null); startTransition(async () => { const result = await addCashMovement(shiftId, type, { success: false }, formData); if (result.success) { toast.success(incoming ? "Kas masuk dicatat." : "Kas keluar dicatat."); setOpen(false); } else setError(result.error ?? "Gagal mencatat pergerakan kas."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="outline">{incoming ? <ArrowDownToLine className="size-4" aria-hidden="true" /> : <ArrowUpFromLine className="size-4" aria-hidden="true" />}{incoming ? "Kas Masuk" : "Kas Keluar"}</Button>} /><DialogContent><DialogHeader><DialogTitle>{incoming ? "Catat Kas Masuk" : "Catat Kas Keluar"}</DialogTitle><DialogDescription>Jumlah dan catatan akan masuk ke rekonsiliasi shift.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor={`${type}-amount`}>Jumlah (Rp)</Label><Input id={`${type}-amount`} name="amount" type="number" min={1} step="1" required /></div><div className="space-y-2"><Label htmlFor={`${type}-notes`}>Catatan</Label><Textarea id={`${type}-notes`} name="notes" minLength={2} maxLength={1000} required /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function CloseShiftDialog({ shiftId, expectedCash }: { shiftId: string; expectedCash: number }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { setError(null); startTransition(async () => { const result = await closeShift(shiftId, { success: false }, formData); if (result.success) { toast.success("Shift ditutup."); setOpen(false); } else setError(result.error ?? "Gagal menutup shift."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="destructive"><LockKeyhole className="size-4" aria-hidden="true" />Tutup Shift</Button>} /><DialogContent><DialogHeader><DialogTitle>Tutup Shift</DialogTitle><DialogDescription>Kas yang diharapkan saat ini {formatCurrencyIDR(expectedCash)}. Hitung uang fisik sebelum menutup shift.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="actualCash">Kas aktual (Rp)</Label><Input id="actualCash" name="actualCash" type="number" min={0} step="1" defaultValue={expectedCash} required /></div><div className="space-y-2"><Label htmlFor="closingNotes">Catatan penutupan</Label><Textarea id="closingNotes" name="notes" maxLength={1000} /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Menutup..." : "Tutup Shift"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ShiftDetailActions({ shiftId, expectedCash }: { shiftId: string; expectedCash: number }) { return <div className="flex flex-wrap gap-2"><CashMovementDialog shiftId={shiftId} type="CASH_IN" /><CashMovementDialog shiftId={shiftId} type="CASH_OUT" /><CloseShiftDialog shiftId={shiftId} expectedCash={expectedCash} /></div>; }
