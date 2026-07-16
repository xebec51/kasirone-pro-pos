import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Mail, ShieldCheck, Boxes, Clock3, Wallet, Users, FileSpreadsheet, ClipboardList } from "lucide-react";
import { requireStoreMember } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Developer",
};

const TECH_STACK = [
  "Next.js (App Router)",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
  "Prisma",
  "PostgreSQL / Neon",
  "NextAuth",
  "Zod",
  "React Hook Form",
  "TanStack Table",
  "Recharts",
  "xlsx",
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: "Checkout POS yang transaction-safe (stok, kas, dan pembayaran konsisten)" },
  { icon: Boxes, text: "Kartu stok (stock ledger) untuk setiap perubahan stok" },
  { icon: Clock3, text: "Rekonsiliasi shift kasir (kas diharapkan vs kas aktual)" },
  { icon: Wallet, text: "Utang pelanggan / store credit" },
  { icon: Users, text: "Operasional toko berbasis peran (RBAC)" },
  { icon: ClipboardList, text: "Log aktivitas (audit log) untuk aksi penting" },
  { icon: FileSpreadsheet, text: "Laporan dengan ekspor XLSX" },
];

export default async function DeveloperPage() {
  await requireStoreMember();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Detail Developer" description="Konteks portofolio di balik KasirOne Pro." />

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Muh. Rinaldi Ruslan</h2>
          <p className="text-sm text-muted-foreground">Full-Stack Developer</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="https://github.com/xebec51/kasirone-pro-pos"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Repositori GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/rinaldiruslan"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            LinkedIn
          </Link>
          <Link
            href="mailto:rinaldi.ruslan51@gmail.com"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          >
            <Mail className="size-4" aria-hidden="true" />
            rinaldi.ruslan51@gmail.com
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-1 font-medium text-foreground">Konteks Proyek</h3>
        <p className="text-sm text-muted-foreground">
          KasirOne Pro adalah proyek portofolio: sistem kasir dan operasional toko
          manual untuk usaha kecil (warung, toko kelontong, kedai kopi, minimarket
          rumahan). Dibangun untuk mendemonstrasikan alur bisnis nyata — bukan
          sekadar CRUD — mulai dari stok masuk, transaksi kasir, shift, hingga
          laporan.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-3 font-medium text-foreground">Tumpukan Teknologi</h3>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-3 font-medium text-foreground">Sorotan Rekayasa</h3>
        <ul className="space-y-2.5">
          {HIGHLIGHTS.map((h) => (
            <li key={h.text} className="flex items-start gap-2.5 text-sm text-foreground">
              <h.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {h.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
