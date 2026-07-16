import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingCart } from "lucide-react";

export default async function PosPage() {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Kasir (POS)" description="Checkout transaksi penjualan." />
      <EmptyState
        icon={ShoppingCart}
        title="Halaman POS akan segera hadir"
        description="Pencarian produk, keranjang, dan pembayaran akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
