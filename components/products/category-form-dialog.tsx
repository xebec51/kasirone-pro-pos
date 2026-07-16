"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCategory, updateCategory } from "@/lib/actions/categories";

type CategoryFormDialogProps = {
  mode: "create" | "edit";
  category?: { id: string; name: string; description: string | null };
};

export function CategoryFormDialog({ mode, category }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "edit" && category
          ? await updateCategory(category.id, { success: false }, formData)
          : await createCategory({ success: false }, formData);

      if (result.success) {
        toast.success(mode === "create" ? "Kategori ditambahkan." : "Kategori diperbarui.");
        setOpen(false);
      } else {
        setError(result.error ?? "Gagal menyimpan kategori.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Tambah Kategori
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label={`Edit kategori ${category?.name}`}>
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Kategori" : "Edit Kategori"}</DialogTitle>
          <DialogDescription>
            Kategori membantu mengelompokkan produk di POS dan laporan.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kategori</Label>
            <Input id="name" name="name" defaultValue={category?.name} required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Textarea id="description" name="description" defaultValue={category?.description ?? ""} maxLength={500} />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
