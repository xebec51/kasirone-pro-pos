import Link from "next/link";
import { KasironeLogo } from "@/components/brand/kasirone-logo";
import { Button } from "@/components/ui/button";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="KasirOne Pro home">
          <KasironeLogo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            Fitur
          </Link>
          <Link href="#workflow" className="transition-colors hover:text-foreground">
            Alur Kerja
          </Link>
          <Link href="/dashboard/developer" className="transition-colors hover:text-foreground">
            Developer
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/login" />}>Masuk</Button>
        </div>
      </div>
    </header>
  );
}
