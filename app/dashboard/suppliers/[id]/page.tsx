import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { toNumber } from "@/lib/pos/money";

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireProductAccess();
  const { id } = await params;
  const supplier = await prisma.supplier.findFirst({
    where: { id, storeId: ctx.store.id },
    select: {
      id: true,
      name: true,
      contactName: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      isActive: true,
      restockOrders: {
        select: { id: true, orderNumber: true, status: true, orderDate: true, receivedDate: true, totalCost: true, _count: { select: { items: true } } },
        orderBy: { orderDate: "desc" },
        take: 20,
      },
    },
  });
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description="Ringkasan supplier dan riwayat pesanan restock."
        actions={<SupplierFormDialog supplier={{ id: supplier.id, name: supplier.name, contactName: supplier.contactName, phone: supplier.phone, email: supplier.email, address: supplier.address, notes: supplier.notes, isActive: supplier.isActive }} />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 md:col-span-2">
          <h2 className="font-semibold">Informasi supplier</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Kontak</dt><dd>{supplier.contactName || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Telepon</dt><dd>{supplier.phone || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{supplier.email || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Alamat</dt><dd className="whitespace-pre-wrap">{supplier.address || "-"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground">Catatan</dt><dd className="whitespace-pre-wrap">{supplier.notes || "-"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2"><StatusBadge label={supplier.isActive ? "Aktif" : "Tidak Aktif"} tone={supplier.isActive ? "success" : "neutral"} /></div>
          <p className="mt-5 text-xs text-muted-foreground">Total pesanan ditampilkan</p>
          <p className="mt-1 text-2xl font-semibold">{supplier.restockOrders.length}</p>
          <p className="mt-4 text-xs text-muted-foreground">Supplier yang sudah terhubung ke restock tidak dihapus; nonaktifkan bila tidak lagi digunakan.</p>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Riwayat restock</h2>
        {supplier.restockOrders.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pesanan restock untuk supplier ini.</p> : (
          <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>No. Pesanan</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>{supplier.restockOrders.map((order) => <TableRow key={order.id}><TableCell><Link href={`/dashboard/restocks/${order.id}`} className="font-medium hover:underline">{order.orderNumber}</Link></TableCell><TableCell>{DATE_FORMAT.format(order.orderDate)}</TableCell><TableCell><StatusBadge label={order.status.replaceAll("_", " ")} tone={order.status === "RECEIVED" ? "success" : order.status === "CANCELLED" ? "danger" : "info"} /></TableCell><TableCell>{order._count.items}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(order.totalCost))}</TableCell></TableRow>)}</TableBody>
          </Table></div>
        )}
      </section>
    </div>
  );
}
