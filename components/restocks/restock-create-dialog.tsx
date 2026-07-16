"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRestockOrder } from "@/lib/actions/restocks";

export function RestockCreateDialog({ suppliers }: { suppliers: { id: string; name: string }[] }) { const router = useRouter(); const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition(); function submit(data: FormData) { setError(null); startTransition(async () => { const result = await createRestockOrder({ success: false }, data); if (result.success && result.id) { setOpen(false); router.push(`/dashboard/restocks/${result.id}`); } else setError(result.error ?? "Draf gagal dibuat."); }); } return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button><Plus className="size-4" aria-hidden="true" />Buat Restock</Button>} /><DialogContent><DialogHeader><DialogTitle>Buat Draf Restock</DialogTitle><DialogDescription>Pilih supplier, lalu tambahkan produk pada halaman detail.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="restock-supplier">Supplier</Label><Select name="supplierId"><SelectTrigger id="restock-supplier" className="w-full"><SelectValue placeholder="Pilih supplier" /></SelectTrigger><SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="restock-notes">Catatan</Label><Textarea id="restock-notes" name="notes" maxLength={1000} /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={pending || suppliers.length === 0}>{pending ? "Membuat..." : "Buat Draf"}</Button></DialogFooter></form></DialogContent></Dialog>; }
