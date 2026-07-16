"use client";

import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adjustStock } from "@/lib/actions/stock";

export function StockAdjustmentDialog({ products }: { products: { id: string; name: string; sku: string; stock: number; unit: string }[] }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  function submit(formData: FormData) { setError(null); startTransition(async () => { const result = await adjustStock({ success: false }, formData); if (result.success) { toast.success("Penyesuaian stok disimpan."); setOpen(false); } else setError(result.error ?? "Penyesuaian gagal disimpan."); }); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button><SlidersHorizontal className="size-4" aria-hidden="true" />Penyesuaian Stok</Button>} /><DialogContent><DialogHeader><DialogTitle>Penyesuaian Stok</DialogTitle><DialogDescription>Masukkan nilai positif untuk menambah atau negatif untuk mengurangi stok. Setiap perubahan masuk ke ledger.</DialogDescription></DialogHeader><form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="adjust-product">Produk</Label><Select name="productId"><SelectTrigger id="adjust-product" className="w-full"><SelectValue placeholder="Pilih produk" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · stok {product.stock} {product.unit}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="quantityChange">Perubahan jumlah</Label><Input id="quantityChange" name="quantityChange" type="number" step="0.001" required placeholder="Contoh: 5 atau -2" /></div><div className="space-y-2"><Label htmlFor="adjust-reason">Alasan</Label><Textarea id="adjust-reason" name="reason" minLength={3} maxLength={500} required /></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}<DialogFooter><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan Penyesuaian"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
