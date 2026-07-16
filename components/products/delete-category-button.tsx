"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/lib/actions/categories";

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Hapus kategori "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success("Kategori dihapus.");
      } else {
        toast.error(result.error ?? "Gagal menghapus kategori.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Hapus kategori ${name}`}
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );
}
