import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryFormDialog } from "@/components/products/category-form-dialog";
import { DeleteCategoryButton } from "@/components/products/delete-category-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tags } from "lucide-react";

export default async function CategoriesPage() {
  const ctx = await requireProductAccess();

  const categories = await prisma.category.findMany({
    where: { storeId: ctx.store.id },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori"
        description="Kelompokkan produk berdasarkan kategori."
        actions={<CategoryFormDialog mode="create" />}
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Belum ada kategori"
          description="Tambahkan kategori pertama untuk mulai mengelompokkan produk."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah Produk</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>{category._count.products}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <CategoryFormDialog mode="edit" category={category} />
                      <DeleteCategoryButton id={category.id} name={category.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
