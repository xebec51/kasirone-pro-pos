import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/client";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { DebtPaymentDialog } from "@/components/customers/debt-payment-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { toNumber } from "@/lib/pos/money";

const CUSTOMER_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function customerTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "neutral" as const;
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAnyRole(CUSTOMER_ROLES);
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: ctx.store.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      notes: true,
      status: true,
      currentDebt: true,
      creditLimit: true,
      sales: {
        select: { id: true, saleNumber: true, status: true, paymentStatus: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      debtPayments: {
        select: { id: true, amount: true, method: true, paidAt: true, receivedBy: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
        take: 10,
      },
    },
  });
  if (!customer) notFound();

  const currentDebt = toNumber(customer.currentDebt);
  const creditLimit = customer.creditLimit === null ? null : toNumber(customer.creditLimit);
  const editableCustomer = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    status: customer.status,
    creditLimit,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description="Detail pelanggan, transaksi terbaru, dan riwayat pembayaran utang."
        actions={<><CustomerFormDialog customer={editableCustomer} />{currentDebt > 0 ? <DebtPaymentDialog customerId={customer.id} customerName={customer.name} currentDebt={currentDebt} /> : null}</>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Utang berjalan</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrencyIDR(currentDebt)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Batas kredit</p>
          <p className="mt-1 text-xl font-semibold">{creditLimit === null ? "Tanpa batas" : formatCurrencyIDR(creditLimit)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-2"><StatusBadge label={customer.status === "ACTIVE" ? "Aktif" : customer.status === "BLOCKED" ? "Diblokir" : "Tidak Aktif"} tone={customerTone(customer.status)} /></div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Kontak</p>
          <p className="mt-1 text-sm font-medium">{customer.phone || customer.email || "Belum tersedia"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Informasi pelanggan</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-muted-foreground">Telepon</dt><dd>{customer.phone || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{customer.email || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Alamat</dt><dd className="whitespace-pre-wrap">{customer.address || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Catatan</dt><dd className="whitespace-pre-wrap">{customer.notes || "-"}</dd></div>
          </dl>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Kebijakan utang</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Saldo utang tidak dapat diedit langsung. Perubahan hanya dicatat melalui transaksi dengan pembayaran sebagian atau alur pembayaran utang.
          </p>
          {creditLimit !== null ? (
            <p className="mt-3 text-sm">Sisa limit: <span className="font-medium">{formatCurrencyIDR(Math.max(0, creditLimit - currentDebt))}</span></p>
          ) : null}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Transaksi terbaru</h2>
        {customer.sales.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada transaksi.</p> : (
          <div className="rounded-lg border">
            <Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{customer.sales.map((sale) => <TableRow key={sale.id}><TableCell><Link href={`/dashboard/transactions/${sale.id}`} className="font-medium hover:underline">{sale.saleNumber}</Link></TableCell><TableCell>{DATE_FORMAT.format(sale.createdAt)}</TableCell><TableCell>{sale.status} · {sale.paymentStatus}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(sale.total))}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Pembayaran utang terbaru</h2>
        {customer.debtPayments.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pembayaran utang.</p> : (
          <div className="rounded-lg border">
            <Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Metode</TableHead><TableHead>Diterima oleh</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
              <TableBody>{customer.debtPayments.map((payment) => <TableRow key={payment.id}><TableCell>{DATE_FORMAT.format(payment.paidAt)}</TableCell><TableCell>{payment.method}</TableCell><TableCell>{payment.receivedBy.name}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(payment.amount))}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
