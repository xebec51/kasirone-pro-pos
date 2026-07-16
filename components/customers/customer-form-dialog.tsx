"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

type EditableCustomer = { id: string; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; status: string; creditLimit: number | null };

export function CustomerFormDialog({ customer }: { customer?: EditableCustomer }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(customer);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = customer ? await updateCustomer(customer.id, { success: false }, formData) : await createCustomer({ success: false }, formData);
      if (result.success) {
        toast.success(customer ? "Pelanggan diperbarui." : "Pelanggan ditambahkan.");
        setOpen(false);
      } else setError(result.error ?? "Gagal menyimpan pelanggan.");
    });
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant={isEdit ? "outline" : "default"}>{isEdit ? <Pencil className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}{isEdit ? "Edit Pelanggan" : "Tambah Pelanggan"}</Button>} />
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{isEdit ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle><DialogDescription>Saldo utang dikelola melalui transaksi dan pembayaran utang, bukan dari formulir ini.</DialogDescription></DialogHeader>
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="customer-name">Nama</Label><Input id="customer-name" name="name" defaultValue={customer?.name ?? ""} required maxLength={150} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="customer-phone">Telepon</Label><Input id="customer-phone" name="phone" defaultValue={customer?.phone ?? ""} maxLength={30} /></div><div className="space-y-2"><Label htmlFor="customer-email">Email</Label><Input id="customer-email" name="email" type="email" defaultValue={customer?.email ?? ""} maxLength={150} /></div></div>
        <div className="space-y-2"><Label htmlFor="customer-address">Alamat</Label><Textarea id="customer-address" name="address" defaultValue={customer?.address ?? ""} maxLength={500} /></div>
        <div className="space-y-2"><Label htmlFor="customer-notes">Catatan</Label><Textarea id="customer-notes" name="notes" defaultValue={customer?.notes ?? ""} maxLength={1000} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="customer-credit">Limit Kredit (Rp)</Label><Input id="customer-credit" name="creditLimit" type="number" min={0} step="1" defaultValue={customer?.creditLimit ?? ""} placeholder="Tanpa batas" /></div><div className="space-y-2"><Label htmlFor="customer-status">Status</Label><Select name="status" defaultValue={customer?.status ?? "ACTIVE"}><SelectTrigger id="customer-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Tidak Aktif</SelectItem><SelectItem value="BLOCKED">Diblokir</SelectItem></SelectContent></Select></div></div>
        {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
        <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
