"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProductAccess } from "@/lib/auth/rbac";

export type ActionState = { success: boolean; error?: string };

// FormData.get() returns null (not undefined) for fields absent from the DOM
// (e.g. imageUrl, which has no input in either product form yet) — every
// optional string field must tolerate null, not just undefined/"".
const productBaseSchema = z.object({
  sku: z.string().trim().min(1, "SKU wajib diisi").max(50),
  barcode: z.string().trim().max(50).nullish(),
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(150),
  description: z.string().trim().max(1000).nullish(),
  categoryId: z.string().nullish(),
  costPrice: z.coerce.number().min(0, "Harga modal tidak valid"),
  sellingPrice: z.coerce.number().min(0, "Harga jual tidak valid"),
  minStock: z.coerce.number().min(0, "Stok minimum tidak valid"),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  imageUrl: z.string().trim().max(500).nullish(),
});

const createProductSchema = productBaseSchema.extend({
  stock: z.coerce.number().min(0, "Stok awal tidak valid"),
});

function readProductForm(formData: FormData) {
  return {
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    minStock: formData.get("minStock"),
    unit: formData.get("unit"),
    status: formData.get("status"),
    imageUrl: formData.get("imageUrl"),
  };
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = createProductSchema.safeParse({
    ...readProductForm(formData),
    stock: formData.get("stock"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, storeId: ctx.store.id },
      select: { id: true },
    });
    if (!category) return { success: false, error: "Kategori tidak ditemukan di toko ini." };
  }

  const existingSku = await prisma.product.findUnique({
    where: { storeId_sku: { storeId: ctx.store.id, sku: data.sku } },
  });
  if (existingSku) {
    return { success: false, error: "SKU sudah digunakan produk lain." };
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        storeId: ctx.store.id,
        categoryId: data.categoryId || null,
        sku: data.sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stock: data.stock,
        minStock: data.minStock,
        unit: data.unit,
        status: data.status,
        imageUrl: data.imageUrl || null,
      },
    });

    if (data.stock > 0) {
      await tx.stockMovement.create({
        data: {
          storeId: ctx.store.id,
          productId: product.id,
          type: "STOCK_OPNAME",
          quantityChange: data.stock,
          stockBefore: 0,
          stockAfter: data.stock,
          reason: "Stok awal produk",
          createdById: ctx.user.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "CREATE",
        module: "products",
        description: `Menambah produk ${data.name}`,
      },
    });
  });

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function updateProduct(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = productBaseSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  const product = await prisma.product.findFirst({ where: { id, storeId: ctx.store.id } });
  if (!product) {
    return { success: false, error: "Produk tidak ditemukan." };
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, storeId: ctx.store.id },
      select: { id: true },
    });
    if (!category) return { success: false, error: "Kategori tidak ditemukan di toko ini." };
  }

  if (data.sku !== product.sku) {
    const existingSku = await prisma.product.findUnique({
      where: { storeId_sku: { storeId: ctx.store.id, sku: data.sku } },
    });
    if (existingSku) {
      return { success: false, error: "SKU sudah digunakan produk lain." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId || null,
        sku: data.sku,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        minStock: data.minStock,
        unit: data.unit,
        status: data.status,
        imageUrl: data.imageUrl || null,
      },
    });
    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "UPDATE",
        module: "products",
        description: `Memperbarui produk ${data.name}`,
      },
    });
  });

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  return { success: true };
}
