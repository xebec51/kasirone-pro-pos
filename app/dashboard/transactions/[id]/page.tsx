import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptActions } from "@/components/transactions/receipt-actions";
import { SaleReversalActions } from "@/components/transactions/sale-reversal-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSaleAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, SALE_STATUS_LABELS } from "@/lib/pos/labels";
import { toNumber } from "@/lib/pos/money";
import { UserRole } from "@/app/generated/prisma/client";

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" });

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await requireSaleAccess(id);
  const sale = await prisma.sale.findFirst({
    where: { id, storeId: ctx.store.id },
    select: {
      id: true, saleNumber: true, status: true, paymentStatus: true, subtotal: true, itemDiscountTotal: true, transactionDiscount: true, taxAmount: true, serviceAmount: true, total: true, paidAmount: true, changeAmount: true, unpaidAmount: true, notes: true, completedAt: true, createdAt: true, voidReason: true,
      cashier: { select: { name: true } }, customer: { select: { id: true, name: true, phone: true } }, shift: { select: { id: true } },
      store: { select: { name: true, address: true, phone: true, email: true, receiptFooter: true, settings: { select: { receiptWidth: true, receiptFooter: true } } } },
      items: { select: { id: true, productNameSnapshot: true, skuSnapshot: true, unitSnapshot: true, quantity: true, unitPrice: true, discountAmount: true, subtotal: true }, orderBy: { createdAt: "asc" } },
      payments: { select: { id: true, method: true, amount: true, reference: true, notes: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      receipt: { select: { receiptNumber: true, printedAt: true, createdAt: true } },
    },
  });
  if (!sale) notFound();
  const transactionDate = sale.completedAt ?? sale.createdAt;
  const receiptWidth = sale.store.settings?.receiptWidth === "58mm" ? "58mm" : "80mm";
  const footer = sale.store.settings?.receiptFooter ?? sale.store.receiptFooter ?? "Terima kasih telah berbelanja.";
  const statusTone = sale.status === "COMPLETED" ? "success" : sale.status === "HELD" ? "warning" : "danger";

  return <div className="space-y-6">
    <div className="no-print"><PageHeader title={sale.saleNumber} description={DATE_FORMAT.format(transactionDate)} actions={<>{sale.receipt ? <ReceiptActions saleId={sale.id} /> : null}{sale.status === "COMPLETED" && (ctx.member.role === UserRole.OWNER || ctx.member.role === UserRole.MANAGER) ? <SaleReversalActions saleId={sale.id} saleNumber={sale.saleNumber} /> : null}</>} /></div>
    <div className="no-print flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"><StatusBadge label={SALE_STATUS_LABELS[sale.status] ?? sale.status} tone={statusTone} /><StatusBadge label={PAYMENT_STATUS_LABELS[sale.paymentStatus] ?? sale.paymentStatus} tone={sale.paymentStatus === "PAID" ? "success" : sale.paymentStatus === "UNPAID" ? "danger" : "warning"} /><span className="text-sm text-muted-foreground">Operator: {sale.cashier.name}</span>{sale.shift ? <Link href={`/dashboard/shifts/${sale.shift.id}`} className="text-sm font-medium text-primary hover:underline">Lihat shift</Link> : null}</div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
      <div className="no-print space-y-6">
        <section className="space-y-3"><h2 className="font-semibold">Item transaksi</h2><div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>Jumlah</TableHead><TableHead>Harga</TableHead><TableHead>Diskon</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader><TableBody>{sale.items.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.productNameSnapshot}</p><p className="text-xs text-muted-foreground">{item.skuSnapshot}</p></TableCell><TableCell>{toNumber(item.quantity)} {item.unitSnapshot}</TableCell><TableCell>{formatCurrencyIDR(toNumber(item.unitPrice))}</TableCell><TableCell>{formatCurrencyIDR(toNumber(item.discountAmount))}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(item.subtotal))}</TableCell></TableRow>)}</TableBody></Table></div></section>
        <div className="grid gap-4 md:grid-cols-2"><section className="rounded-lg border bg-card p-4"><h2 className="font-semibold">Pelanggan</h2>{sale.customer ? <div className="mt-3 text-sm"><Link href={`/dashboard/customers/${sale.customer.id}`} className="font-medium text-primary hover:underline">{sale.customer.name}</Link><p className="text-muted-foreground">{sale.customer.phone || "Tanpa nomor telepon"}</p></div> : <p className="mt-3 text-sm text-muted-foreground">Pelanggan umum</p>}</section><section className="rounded-lg border bg-card p-4"><h2 className="font-semibold">Catatan</h2><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{sale.notes || sale.voidReason || "Tidak ada catatan."}</p></section></div>
        <section className="space-y-3"><h2 className="font-semibold">Pembayaran</h2>{sale.payments.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p> : <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Metode</TableHead><TableHead>Referensi</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader><TableBody>{sale.payments.map((payment) => <TableRow key={payment.id}><TableCell>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</TableCell><TableCell>{payment.reference || "-"}</TableCell><TableCell className="text-right">{formatCurrencyIDR(toNumber(payment.amount))}</TableCell></TableRow>)}</TableBody></Table></div>}</section>
        <section className="ml-auto max-w-sm space-y-2 rounded-lg border bg-card p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrencyIDR(toNumber(sale.subtotal))}</span></div><div className="flex justify-between"><span>Diskon</span><span>-{formatCurrencyIDR(toNumber(sale.itemDiscountTotal) + toNumber(sale.transactionDiscount))}</span></div>{toNumber(sale.taxAmount) > 0 ? <div className="flex justify-between"><span>Pajak</span><span>{formatCurrencyIDR(toNumber(sale.taxAmount))}</span></div> : null}{toNumber(sale.serviceAmount) > 0 ? <div className="flex justify-between"><span>Layanan</span><span>{formatCurrencyIDR(toNumber(sale.serviceAmount))}</span></div> : null}<div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatCurrencyIDR(toNumber(sale.total))}</span></div><div className="flex justify-between"><span>Terbayar</span><span>{formatCurrencyIDR(toNumber(sale.paidAmount))}</span></div><div className="flex justify-between"><span>Belum dibayar</span><span>{formatCurrencyIDR(toNumber(sale.unpaidAmount))}</span></div><div className="flex justify-between"><span>Kembalian</span><span>{formatCurrencyIDR(toNumber(sale.changeAmount))}</span></div></section>
      </div>

      {sale.receipt ? <section className="receipt-print-area mx-auto bg-white p-4 font-mono text-[11px] leading-tight text-black shadow-sm ring-1 ring-black/10" style={{ width: receiptWidth }} aria-label="Pratinjau struk">
        <div className="text-center"><h2 className="text-sm font-bold">{sale.store.name}</h2>{sale.store.address ? <p>{sale.store.address}</p> : null}{sale.store.phone ? <p>{sale.store.phone}</p> : null}</div>
        <div className="my-3 border-t border-dashed border-black" />
        <div className="space-y-1"><div className="flex justify-between gap-2"><span>Struk</span><span>{sale.receipt.receiptNumber}</span></div><div className="flex justify-between gap-2"><span>Transaksi</span><span>{sale.saleNumber}</span></div><div className="flex justify-between gap-2"><span>Tanggal</span><span className="text-right">{DATE_FORMAT.format(transactionDate)}</span></div><div className="flex justify-between gap-2"><span>Kasir</span><span>{sale.cashier.name}</span></div>{sale.customer ? <div className="flex justify-between gap-2"><span>Pelanggan</span><span>{sale.customer.name}</span></div> : null}</div>
        <div className="my-3 border-t border-dashed border-black" />
        <div className="space-y-2">{sale.items.map((item) => <div key={item.id}><p>{item.productNameSnapshot}</p><div className="flex justify-between gap-2"><span>{toNumber(item.quantity)} {item.unitSnapshot} × {formatCurrencyIDR(toNumber(item.unitPrice))}</span><span>{formatCurrencyIDR(toNumber(item.subtotal))}</span></div>{toNumber(item.discountAmount) > 0 ? <p className="text-right">Diskon -{formatCurrencyIDR(toNumber(item.discountAmount))}</p> : null}</div>)}</div>
        <div className="my-3 border-t border-dashed border-black" />
        <div className="space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrencyIDR(toNumber(sale.subtotal))}</span></div>{toNumber(sale.itemDiscountTotal) + toNumber(sale.transactionDiscount) > 0 ? <div className="flex justify-between"><span>Diskon</span><span>-{formatCurrencyIDR(toNumber(sale.itemDiscountTotal) + toNumber(sale.transactionDiscount))}</span></div> : null}{toNumber(sale.taxAmount) > 0 ? <div className="flex justify-between"><span>Pajak</span><span>{formatCurrencyIDR(toNumber(sale.taxAmount))}</span></div> : null}{toNumber(sale.serviceAmount) > 0 ? <div className="flex justify-between"><span>Layanan</span><span>{formatCurrencyIDR(toNumber(sale.serviceAmount))}</span></div> : null}<div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatCurrencyIDR(toNumber(sale.total))}</span></div><div className="flex justify-between"><span>Dibayar</span><span>{formatCurrencyIDR(toNumber(sale.paidAmount))}</span></div>{toNumber(sale.unpaidAmount) > 0 ? <div className="flex justify-between"><span>Utang</span><span>{formatCurrencyIDR(toNumber(sale.unpaidAmount))}</span></div> : null}<div className="flex justify-between"><span>Kembali</span><span>{formatCurrencyIDR(toNumber(sale.changeAmount))}</span></div></div>
        <div className="my-3 border-t border-dashed border-black" />
        <div className="space-y-1">{sale.payments.map((payment) => <div key={payment.id} className="flex justify-between gap-2"><span>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</span><span>{formatCurrencyIDR(toNumber(payment.amount))}</span></div>)}</div>
        <p className="mt-4 whitespace-pre-wrap text-center">{footer}</p>
      </section> : <div className="no-print rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Struk belum tersedia untuk transaksi ini.</div>}
    </div>
  </div>;
}
