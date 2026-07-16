"use client";

import { useState, useTransition } from "react";
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
import { updateProduct, type ActionState } from "@/lib/actions/products";

type Category = { id: string; name: string };

type ProductEditFormProps = {
  product: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    description: string | null;
    categoryId: string | null;
    costPrice: number;
    sellingPrice: number;
    minStock: number;
    unit: string;
    status: string;
    imageUrl: string | null;
  };
  categories: Category[];
};

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const [state, setState] = useState<ActionState>({ success: false });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState({ success: false });
    startTransition(async () => {
      const result = await updateProduct(product.id, { success: false }, formData);
      setState(result);
      if (result.success) toast.success("Produk diperbarui.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product.sku} required maxLength={50} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode (opsional)</Label>
          <Input id="barcode" name="barcode" defaultValue={product.barcode ?? ""} maxLength={50} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama Produk</Label>
        <Input id="name" name="name" defaultValue={product.name} required maxLength={150} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (opsional)</Label>
        <Textarea id="description" name="description" defaultValue={product.description ?? ""} maxLength={1000} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Kategori</Label>
        <Select name="categoryId" defaultValue={product.categoryId ?? ""}>
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
          <Input id="costPrice" name="costPrice" type="number" min={0} step="1" defaultValue={product.costPrice} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Harga Jual (Rp)</Label>
          <Input id="sellingPrice" name="sellingPrice" type="number" min={0} step="1" defaultValue={product.sellingPrice} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minStock">Stok Minimum</Label>
          <Input id="minStock" name="minStock" type="number" min={0} step="1" defaultValue={product.minStock} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Satuan</Label>
          <Input id="unit" name="unit" defaultValue={product.unit} required maxLength={20} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={product.status}>
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

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
