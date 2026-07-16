import Link from "next/link";
import {
  ShoppingCart,
  Boxes,
  Clock,
  Wallet,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  PackagePlus,
  Receipt,
} from "lucide-react";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: ShoppingCart,
    title: "POS Manual yang Cepat",
    description:
      "Checkout sentuh-cepat dengan pencarian produk, diskon per item, tahan transaksi, dan pembayaran split.",
  },
  {
    icon: Clock,
    title: "Buka & Tutup Shift",
    description:
      "Kasir wajib buka shift sebelum transaksi. Tutup shift menghitung selisih kas otomatis.",
  },
  {
    icon: Boxes,
    title: "Kartu Stok Real-time",
    description:
      "Setiap penjualan, restock, void, dan penyesuaian tercatat sebagai riwayat pergerakan stok.",
  },
  {
    icon: PackagePlus,
    title: "Restock & Supplier",
    description:
      "Buat order restock, terima barang bertahap, dan stok bertambah otomatis dengan jejak supplier.",
  },
  {
    icon: Wallet,
    title: "Utang Pelanggan",
    description:
      "Transaksi belum lunas tercatat sebagai utang pelanggan, lengkap dengan riwayat pembayaran cicilan.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Ekspor XLSX",
    description:
      "Ringkasan penjualan, estimasi laba, performa kasir, dan laporan stok siap diekspor ke Excel.",
  },
];

const WORKFLOW_STEPS = [
  "Barang masuk",
  "Stok bertambah",
  "Kasir buka shift",
  "Transaksi penjualan",
  "Stok berkurang",
  "Struk dibuat",
  "Kas dicatat",
  "Shift ditutup",
  "Laporan terbentuk",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteNavbar />
      <main className="flex-1">
        <section className="border-b border-border bg-linear-to-b from-primary-soft/40 to-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
              Proyek portofolio full-stack
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Sistem kasir dan operasional toko untuk usaha kecil.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              KasirOne Pro membantu warung, toko kelontong, kedai kopi, dan
              minimarket rumahan mengelola transaksi, stok, shift kasir, dan
              utang pelanggan dalam satu sistem yang realistis.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/login" />}>
                Masuk ke Dashboard
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="#features" />}>
                Lihat Fitur
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Coba akun demo:</p>
              <p>
                owner@kasirone.demo &middot; manager@kasirone.demo &middot;
                cashier@kasirone.demo &middot; inventory@kasirone.demo
              </p>
              <p>
                Password untuk semua akun: <span className="font-mono">Password123!</span>
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Semua yang dibutuhkan operasional toko harian
            </h2>
            <p className="text-muted-foreground">
              Bukan sekadar CRUD — KasirOne Pro meniru alur kerja toko nyata,
              dari kas masuk sampai laporan laba.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                  <feature.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 font-medium text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="border-y border-border bg-secondary/50"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-10 max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Alur kerja yang nyata
              </h2>
              <p className="text-muted-foreground">
                Satu siklus operasional yang menghubungkan stok, kasir, kas,
                dan laporan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
                    {step}
                  </span>
                  {index < WORKFLOW_STEPS.length - 1 ? (
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
            <Receipt className="size-8 text-primary" aria-hidden="true" />
            <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-foreground">
              Siap mencoba alur kasir sampai laporan?
            </h2>
            <p className="max-w-md text-muted-foreground">
              Masuk dengan akun demo dan jalankan transaksi lengkap dari buka
              shift sampai cetak struk.
            </p>
            <Button size="lg" render={<Link href="/login" />}>
              Masuk Sekarang
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
