"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { KasironeLogo } from "@/components/brand/kasirone-logo";
import type { NavSection } from "@/lib/dashboard/nav";

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetHeader className="border-b border-sidebar-border">
          <SheetTitle>
            <KasironeLogo />
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Buka menu navigasi"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
    </Sheet>
  );
}
