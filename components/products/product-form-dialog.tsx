"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProduct } from "@/lib/actions/products";

type Category = { id: string; name: string };

export function ProductFormDialog({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProduct({ success: false }, formData);
      if (result.success) {
        toast.success("Produk ditambahkan.");
        setOpen(false);
      } else {
        setError(result.error ?? "Gagal menyimpan produk.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Produk
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Produk</DialogTitle>
          <DialogDescription>Lengkapi data produk baru untuk toko Anda.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (opsional)</Label>
              <Input id="barcode" name="barcode" maxLength={50} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk</Label>
            <Input id="name" name="name" required maxLength={150} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Textarea id="description" name="description" maxLength={1000} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Kategori</Label>
            <Select name="categoryId" defaultValue="">
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="Tanpa kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tanpa kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Harga Modal (Rp)</Label>
              <Input id="costPrice" name="costPrice" type="number" min={0} step="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Harga Jual (Rp)</Label>
              <Input id="sellingPrice" name="sellingPrice" type="number" min={0} step="1" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stock">Stok Awal</Label>
              <Input id="stock" name="stock" type="number" min={0} step="1" defaultValue={0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Stok Minimum</Label>
              <Input id="minStock" name="minStock" type="number" min={0} step="1" defaultValue={0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" name="unit" defaultValue="pcs" required maxLength={20} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue="ACTIVE">
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                <SelectItem value="ARCHIVED">Diarsipkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
