"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pause, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { completeSale, holdSale, type PosActionResult } from "@/lib/actions/pos";
import { formatCurrencyIDR, roundMoney } from "@/lib/pos/currency";
import { PAYMENT_METHOD_LABELS } from "@/lib/pos/labels";

export type PosProduct = { id: string; name: string; sku: string; barcode: string | null; categoryId: string | null; sellingPrice: number; stock: number; unit: string };
export type PosCustomer = { id: string; name: string; phone: string | null; currentDebt: number; creditLimit: number | null };
export type InitialHeldSale = { id: string; customerId: string | null; transactionDiscount: number; notes: string | null; items: { productId: string; quantity: number; discountAmount: number }[] };
type CartLine = PosProduct & { quantity: number; discountAmount: number };
type PaymentLine = { id: number; method: string; amount: number; reference: string };
type Settings = { taxEnabled: boolean; taxRate: number; serviceChargeEnabled: boolean; serviceChargeRate: number; allowNegativeStock: boolean };
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS_MANUAL", "DEBIT", "CREDIT", "E_WALLET_MANUAL", "STORE_CREDIT", "OTHER"];

export function PosWorkspace({ shift, products, categories, customers, settings, initialHeld }: { shift: { id: string; openedAt: string }; products: PosProduct[]; categories: { id: string; name: string }[]; customers: PosCustomer[]; settings: Settings; initialHeld?: InitialHeldSale | null }) {
  const router = useRouter();
  const initialCart = initialHeld?.items.flatMap((item) => { const product = products.find((candidate) => candidate.id === item.productId); return product ? [{ ...product, quantity: item.quantity, discountAmount: item.discountAmount }] : []; }) ?? [];
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [cart, setCart] = useState<CartLine[]>(initialCart);
  const [customerId, setCustomerId] = useState(initialHeld?.customerId ?? "walk-in");
  const [transactionDiscount, setTransactionDiscount] = useState(initialHeld?.transactionDiscount ?? 0);
  const [payments, setPayments] = useState<PaymentLine[]>([{ id: 1, method: "CASH", amount: 0, reference: "" }]);
  const [nextPaymentId, setNextPaymentId] = useState(2);
  const [notes, setNotes] = useState(initialHeld?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState<PosActionResult["sale"] | null>(null);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) =>
      (categoryId === "all" || product.categoryId === categoryId) &&
      (!needle || product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle) || product.barcode?.toLowerCase().includes(needle)),
    );
  }, [products, query, categoryId]);

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0));
  const itemDiscount = roundMoney(cart.reduce((sum, item) => sum + item.discountAmount, 0));
  const net = Math.max(0, subtotal - itemDiscount - transactionDiscount);
  const tax = settings.taxEnabled ? roundMoney((net * settings.taxRate) / 100) : 0;
  const service = settings.serviceChargeEnabled ? roundMoney((net * settings.serviceChargeRate) / 100) : 0;
  const total = roundMoney(net + tax + service);
  const storeCredit = roundMoney(payments.filter((payment) => payment.method === "STORE_CREDIT").reduce((sum, payment) => sum + payment.amount, 0));
  const cashTendered = roundMoney(payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + payment.amount, 0));
  const nonCashPaid = roundMoney(payments.filter((payment) => payment.method !== "CASH" && payment.method !== "STORE_CREDIT").reduce((sum, payment) => sum + payment.amount, 0));
  const requiredCash = Math.max(0, total - nonCashPaid - storeCredit);
  const cashApplied = Math.min(cashTendered, requiredCash);
  const paidAmount = Math.min(total, nonCashPaid + cashApplied);
  const unpaidAmount = Math.max(0, roundMoney(total - paidAmount));
  const change = Math.max(0, roundMoney(cashTendered - requiredCash));

  function addProduct(product: PosProduct) {
    setError(null);
    setCart((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (existing) {
        if (!settings.allowNegativeStock && existing.quantity + 1 > product.stock) { toast.error("Stok tidak cukup."); return current; }
        return current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      if (!settings.allowNegativeStock && product.stock <= 0) { toast.error("Produk kehabisan stok."); return current; }
      return [...current, { ...product, quantity: 1, discountAmount: 0 }];
    });
  }

  function updateQuantity(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (quantity <= 0) { setCart((current) => current.filter((item) => item.id !== id)); return; }
    if (!settings.allowNegativeStock && quantity > product.stock) { toast.error("Jumlah melebihi stok tersedia."); return; }
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  }

  function updateItemDiscount(id: string, value: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, discountAmount: Math.max(0, Math.min(value || 0, item.sellingPrice * item.quantity)) } : item));
  }

  function updatePayment(id: number, patch: Partial<PaymentLine>) {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, ...patch } : payment));
  }

  function addPayment() {
    if (payments.length >= 10) return;
    setPayments((current) => [...current, { id: nextPaymentId, method: "CASH", amount: 0, reference: "" }]);
    setNextPaymentId((value) => value + 1);
  }

  function cartPayload() {
    return {
      items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, discountAmount: item.discountAmount })),
      customerId: customerId === "walk-in" ? null : customerId,
      transactionDiscount,
      notes,
      heldSaleId: initialHeld?.id ?? null,
    };
  }

  function submitSale() {
    setError(null);
    if (cart.length === 0) { setError("Keranjang masih kosong."); return; }
    if (total <= 0) { setError("Total transaksi harus lebih dari nol."); return; }
    const positivePayments = payments.filter((payment) => payment.amount > 0);
    if (positivePayments.length === 0) { setError("Tambahkan minimal satu pembayaran."); return; }
    if (nonCashPaid + storeCredit > total) { setError("Pembayaran non-tunai dan kredit melebihi total."); return; }
    if ((unpaidAmount > 0 || storeCredit > 0) && customerId === "walk-in") { setError("Pembayaran sebagian atau kredit toko memerlukan pelanggan."); return; }
    const data = new FormData();
    data.set("payload", JSON.stringify({ ...cartPayload(), payments: positivePayments.map(({ method, amount, reference }) => ({ method, amount, reference })) }));
    startTransition(async () => {
      const result = await completeSale(data);
      if (result.success && result.sale) {
        setCompleted(result.sale); setCart([]); setTransactionDiscount(0); setPayments([{ id: 1, method: "CASH", amount: 0, reference: "" }]); setNotes("");
        toast.success(`Transaksi ${result.sale.saleNumber} selesai.`);
      } else setError(result.error ?? "Transaksi gagal diproses.");
    });
  }

  function submitHold() {
    setError(null);
    if (cart.length === 0) { setError("Keranjang masih kosong."); return; }
    const data = new FormData(); data.set("payload", JSON.stringify(cartPayload()));
    startTransition(async () => {
      const result = await holdSale(data);
      if (result.success) { toast.success(initialHeld ? "Transaksi ditahan diperbarui." : "Keranjang ditahan."); router.push("/dashboard/pos/held"); }
      else setError(result.error ?? "Keranjang gagal ditahan.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-semibold sm:text-2xl">{initialHeld ? "Lanjutkan Transaksi" : "Kasir (POS)"}</h1><p className="text-sm text-muted-foreground">Shift aktif sejak {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(shift.openedAt))}</p></div>
        <div className="flex gap-2"><Button variant="outline" render={<Link href="/dashboard/pos/held" />}>Ditahan</Button><Button variant="outline" render={<Link href={`/dashboard/shifts/${shift.id}`} />}>Lihat Shift</Button></div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, SKU, atau barcode" className="pl-9" autoFocus /></div><Select value={categoryId} onValueChange={(value) => setCategoryId(value || "all")}><SelectTrigger aria-label="Filter kategori"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua kategori</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          {filteredProducts.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50" disabled={!settings.allowNegativeStock && product.stock <= 0}><div className="flex items-start justify-between gap-2"><p className="font-medium">{product.name}</p><span className="text-xs text-muted-foreground">{product.sku}</span></div><p className="mt-3 font-semibold text-primary">{formatCurrencyIDR(product.sellingPrice)}</p><p className={`mt-1 text-xs ${product.stock <= 0 ? "text-destructive" : "text-muted-foreground"}`}>Stok {product.stock} {product.unit}</p></button>)}</div>}
        </section>
        <aside className="space-y-4 rounded-xl border bg-card p-4 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="size-4" aria-hidden="true" />Keranjang</h2><span className="text-sm text-muted-foreground">{cart.length} item</span></div>
          <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1">{cart.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Pilih produk untuk memulai.</p> : cart.map((item) => <div key={item.id} className="space-y-2 rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrencyIDR(item.sellingPrice)} / {item.unit}</p></div><Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus ${item.name}`} onClick={() => updateQuantity(item.id, 0)}><Trash2 className="size-4" aria-hidden="true" /></Button></div><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><Button type="button" variant="outline" size="icon-sm" aria-label={`Kurangi ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="size-3" aria-hidden="true" /></Button><Input type="number" min={0.001} step="1" value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} className="w-16 text-center" aria-label={`Jumlah ${item.name}`} /><Button type="button" variant="outline" size="icon-sm" aria-label={`Tambah ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="size-3" aria-hidden="true" /></Button></div><p className="text-sm font-medium">{formatCurrencyIDR(item.sellingPrice * item.quantity - item.discountAmount)}</p></div><div className="flex items-center gap-2"><Label htmlFor={`discount-${item.id}`} className="text-xs">Diskon item</Label><Input id={`discount-${item.id}`} type="number" min={0} max={item.sellingPrice * item.quantity} value={item.discountAmount} onChange={(event) => updateItemDiscount(item.id, Number(event.target.value))} className="h-7 flex-1" /></div></div>)}</div>
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2"><Label htmlFor="customer">Pelanggan</Label><Select value={customerId} onValueChange={(value) => setCustomerId(value || "walk-in")}><SelectTrigger id="customer" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="walk-in">Pelanggan umum</SelectItem>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="transaction-discount">Diskon transaksi (Rp)</Label><Input id="transaction-discount" type="number" min={0} max={Math.max(0, subtotal - itemDiscount)} value={transactionDiscount} onChange={(event) => setTransactionDiscount(Math.max(0, Math.min(Number(event.target.value) || 0, subtotal - itemDiscount)))} /></div>
            <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrencyIDR(subtotal)}</span></div>{itemDiscount > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Diskon item</span><span>-{formatCurrencyIDR(itemDiscount)}</span></div> : null}{transactionDiscount > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Diskon transaksi</span><span>-{formatCurrencyIDR(transactionDiscount)}</span></div> : null}{tax > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Pajak</span><span>{formatCurrencyIDR(tax)}</span></div> : null}{service > 0 ? <div className="flex justify-between"><span className="text-muted-foreground">Layanan</span><span>{formatCurrencyIDR(service)}</span></div> : null}<div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatCurrencyIDR(total)}</span></div></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label>Pembayaran</Label><Button type="button" variant="outline" size="sm" onClick={addPayment} disabled={payments.length >= 10}><Plus className="size-3" aria-hidden="true" />Metode</Button></div>{payments.map((payment) => <div key={payment.id} className="grid grid-cols-[1fr_110px_auto] gap-2 rounded-lg border p-2"><Select value={payment.method} onValueChange={(value) => updatePayment(payment.id, { method: value || "CASH" })}><SelectTrigger aria-label="Metode pembayaran" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method} value={method}>{PAYMENT_METHOD_LABELS[method] ?? method}</SelectItem>)}</SelectContent></Select><Input type="number" min={0} value={payment.amount} onChange={(event) => updatePayment(payment.id, { amount: Number(event.target.value) || 0 })} aria-label="Jumlah pembayaran" /><Button type="button" variant="ghost" size="icon-sm" aria-label="Hapus pembayaran" disabled={payments.length === 1} onClick={() => setPayments((current) => current.filter((item) => item.id !== payment.id))}><Trash2 className="size-4" aria-hidden="true" /></Button>{payment.method !== "CASH" && payment.method !== "STORE_CREDIT" ? <Input className="col-span-3" value={payment.reference} onChange={(event) => updatePayment(payment.id, { reference: event.target.value })} placeholder="Referensi (opsional)" maxLength={150} /> : null}</div>)}</div>
            <div className="space-y-1 rounded-lg bg-muted p-3 text-sm"><div className="flex justify-between"><span>Terbayar</span><span>{formatCurrencyIDR(paidAmount)}</span></div><div className="flex justify-between"><span>Belum dibayar</span><span className={unpaidAmount > 0 ? "font-medium text-destructive" : ""}>{formatCurrencyIDR(unpaidAmount)}</span></div><div className="flex justify-between"><span>Kembalian</span><span>{formatCurrencyIDR(change)}</span></div></div>
            <div className="space-y-2"><Label htmlFor="sale-notes">Catatan (opsional)</Label><Textarea id="sale-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} /></div>
            {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
            <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={pending || cart.length === 0} onClick={submitHold}><Pause className="size-4" aria-hidden="true" />{pending ? "Menyimpan..." : "Tahan"}</Button><Button type="button" disabled={pending || cart.length === 0} onClick={submitSale}>{pending ? "Memproses..." : "Selesaikan"}</Button></div>
          </div>
        </aside>
      </div>
      <Dialog open={Boolean(completed)} onOpenChange={(open) => { if (!open) setCompleted(null); }}><DialogContent><DialogHeader><DialogTitle>Transaksi Selesai</DialogTitle><DialogDescription>Stok, pembayaran, utang pelanggan, dan kas shift telah diperbarui dalam satu transaksi.</DialogDescription></DialogHeader>{completed ? <div className="space-y-2 rounded-lg border p-4 text-sm"><div className="flex justify-between"><span>No. transaksi</span><strong>{completed.saleNumber}</strong></div><div className="flex justify-between"><span>No. struk</span><strong>{completed.receiptNumber}</strong></div><div className="flex justify-between"><span>Total</span><strong>{formatCurrencyIDR(completed.total)}</strong></div><div className="flex justify-between"><span>Kembalian</span><strong>{formatCurrencyIDR(completed.changeAmount)}</strong></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setCompleted(null)}>Transaksi Baru</Button>{completed ? <Button render={<Link href={`/dashboard/transactions/${completed.id}`} />}>Lihat Struk</Button> : null}</DialogFooter></DialogContent></Dialog>
    </div>
  );
}
