import Link from "next/link";
import { ShiftDetailActions } from "@/components/shifts/shift-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireShiftAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from "@/lib/pos/labels";
import { toNumber } from "@/lib/pos/money";
import { calculateExpectedCash } from "@/lib/pos/shift";

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await requireShiftAccess(id);
  const shift = await prisma.shift.findFirst({
    where: { id, storeId: ctx.store.id },
    select: {
      id: true, status: true, openedAt: true, closedAt: true, openingCash: true, expectedCash: true, actualCash: true, cashDifference: true, notes: true,
      cashier: { select: { name: true, email: true } },
      cashMovements: { select: { id: true, type: true, amount: true, notes: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      sales: { select: { id: true, saleNumber: true, status: true, total: true, completedAt: true, createdAt: true, payments: { select: { method: true, amount: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!shift) return null;
  const totalMovement = (...types: string[]) => shift.cashMovements.filter((movement) => types.includes(movement.type)).reduce((sum, movement) => sum + toNumber(movement.amount), 0);
  const openingCash = toNumber(shift.openingCash);
  const cashSales = totalMovement("SALE_PAYMENT");
  const cashIn = totalMovement("CASH_IN", "DEBT_PAYMENT");
  const cashOut = totalMovement("CASH_OUT");
  const refunds = totalMovement("REFUND");
  const liveExpectedCash = calculateExpectedCash({ openingCash, cashSalePayments: cashSales, cashIn, cashOut, cashRefunds: refunds });
  const expectedCash = shift.expectedCash === null ? liveExpectedCash : toNumber(shift.expectedCash);

  return <div className="space-y-6">
    <PageHeader title={`Shift ${shift.cashier.name}`} description={`${DATE_FORMAT.format(shift.openedAt)}${shift.closedAt ? ` – ${DATE_FORMAT.format(shift.closedAt)}` : " – sedang berjalan"}`} actions={shift.status === "OPEN" ? <ShiftDetailActions shiftId={shift.id} expectedCash={expectedCash} /> : undefined} />
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"><StatusBadge label={shift.status === "OPEN" ? "Terbuka" : "Ditutup"} tone={shift.status === "OPEN" ? "success" : "neutral"} /><span className="text-sm text-muted-foreground">{shift.cashier.email}</span>{shift.notes ? <span className="text-sm">{shift.notes}</span> : null}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Modal awal', openingCash], ['Pembayaran tunai', cashSales], ['Kas masuk', cashIn], ['Kas keluar & refund', cashOut + refunds]].map(([label, amount]) => <div key={String(label)} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{formatCurrencyIDR(Number(amount))}</p></div>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Kas diharapkan</p><p className="mt-1 text-xl font-semibold">{formatCurrencyIDR(expectedCash)}</p></div><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Kas aktual</p><p className="mt-1 text-xl font-semibold">{shift.actualCash === null ? "-" : formatCurrencyIDR(toNumber(shift.actualCash))}</p></div><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Selisih</p><p className={`mt-1 text-xl font-semibold ${shift.cashDifference !== null && toNumber(shift.cashDifference) !== 0 ? "text-destructive" : ""}`}>{shift.cashDifference === null ? "-" : formatCurrencyIDR(toNumber(shift.cashDifference))}</p></div></div>

    <section className="space-y-3"><h2 className="font-semibold">Transaksi shift</h2>{shift.sales.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada transaksi.</p> : <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>No. Transaksi</TableHead><TableHead>Waktu</TableHead><TableHead>Status</TableHead><TableHead>Pembayaran</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{shift.sales.map((sale) => <TableRow key={sale.id}><TableCell><Link href={`/dashboard/transactions/${sale.id}`} className="font-medium hover:underline">{sale.saleNumber}</Link></TableCell><TableCell>{DATE_FORMAT.format(sale.completedAt ?? sale.createdAt)}</TableCell><TableCell>{SALE_STATUS_LABELS[sale.status] ?? sale.status}</TableCell><TableCell>{sale.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method] ?? payment.method).join(", ") || "-"}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(sale.total))}</TableCell></TableRow>)}</TableBody></Table></div>}</section>
    <section className="space-y-3"><h2 className="font-semibold">Pergerakan kas</h2><div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Jenis</TableHead><TableHead>Catatan</TableHead><TableHead>Petugas</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader><TableBody>{shift.cashMovements.map((movement) => <TableRow key={movement.id}><TableCell>{DATE_FORMAT.format(movement.createdAt)}</TableCell><TableCell>{movement.type.replaceAll("_", " ")}</TableCell><TableCell>{movement.notes || "-"}</TableCell><TableCell>{movement.user.name}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(movement.amount))}</TableCell></TableRow>)}</TableBody></Table></div></section>
  </div>;
}
