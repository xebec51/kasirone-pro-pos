import Link from "next/link";
import { KasironeLogo } from "@/components/brand/kasirone-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <KasironeLogo />
          <p className="text-sm text-muted-foreground">
            Sistem kasir dan operasional toko untuk usaha kecil.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} KasirOne Pro. Proyek portofolio.</p>
          <p>
            Dibuat oleh{" "}
            <Link
              href="https://github.com/xebec51"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Muh. Rinaldi Ruslan
            </Link>{" "}
            &middot;{" "}
            <Link
              href="/dashboard/developer"
              className="font-medium text-foreground hover:underline"
            >
              Detail Developer
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
