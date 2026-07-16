"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = { id: string; name: string };

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => updateParam("q", value), 350);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama, SKU, atau barcode"
          className="pl-8"
          aria-label="Cari produk"
        />
      </div>
      <Select
        defaultValue={searchParams.get("categoryId") ?? "all"}
        onValueChange={(value) => updateParam("categoryId", value && value !== "all" ? value : "")}
      >
        <SelectTrigger aria-label="Filter kategori">
          <SelectValue placeholder="Semua kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kategori</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(value) => updateParam("status", value && value !== "all" ? value : "")}
      >
        <SelectTrigger aria-label="Filter status">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua status</SelectItem>
          <SelectItem value="ACTIVE">Aktif</SelectItem>
          <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
          <SelectItem value="ARCHIVED">Diarsipkan</SelectItem>
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("lowStock") ?? "all"}
        onValueChange={(value) => updateParam("lowStock", value && value !== "all" ? value : "")}
      >
        <SelectTrigger aria-label="Filter stok">
          <SelectValue placeholder="Semua stok" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua stok</SelectItem>
          <SelectItem value="low">Stok menipis</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
