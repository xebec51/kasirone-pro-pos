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
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";

type EditableSupplier = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; isActive: boolean };

export function SupplierFormDialog({ supplier }: { supplier?: EditableSupplier }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [isPending, startTransition] = useTransition(); const isEdit = Boolean(supplier);
  function handleSubmit(formData: FormData) { setError(null); startTransition(async () => { const result = supplier ? await updateSupplier(supplier.id, { success: false }, formData) : await createSupplier({ success: false }, formData); if (result.success) { toast.success(supplier ? "Supplier diperbarui." : "Supplier ditambahkan."); setOpen(false); } else setError(result.error ?? "Gagal menyimpan supplier."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant={isEdit ? "outline" : "default"}>{isEdit ? <Pencil className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}{isEdit ? "Edit Supplier" : "Tambah Supplier"}</Button>} /><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{isEdit ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle><DialogDescription>Lengkapi data pemasok untuk alur restock toko.</DialogDescription></DialogHeader><form action={handleSubmit} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="supplier-name">Nama</Label><Input id="supplier-name" name="name" defaultValue={supplier?.name ?? ""} required maxLength={150} /></div>
    <div className="space-y-2"><Label htmlFor="supplier-contact">Nama Kontak</Label><Input id="supplier-contact" name="contactName" defaultValue={supplier?.contactName ?? ""} maxLength={150} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="supplier-phone">Telepon</Label><Input id="supplier-phone" name="phone" defaultValue={supplier?.phone ?? ""} maxLength={30} /></div><div className="space-y-2"><Label htmlFor="supplier-email">Email</Label><Input id="supplier-email" name="email" type="email" defaultValue={supplier?.email ?? ""} maxLength={150} /></div></div>
    <div className="space-y-2"><Label htmlFor="supplier-address">Alamat</Label><Textarea id="supplier-address" name="address" defaultValue={supplier?.address ?? ""} maxLength={500} /></div>
    <div className="space-y-2"><Label htmlFor="supplier-notes">Catatan</Label><Textarea id="supplier-notes" name="notes" defaultValue={supplier?.notes ?? ""} maxLength={1000} /></div>
    <div className="space-y-2"><Label htmlFor="supplier-status">Status</Label><Select name="isActive" defaultValue={supplier?.isActive === false ? "false" : "true"}><SelectTrigger id="supplier-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak Aktif</SelectItem></SelectContent></Select></div>
    {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
