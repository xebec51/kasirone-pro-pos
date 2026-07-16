"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Pemilik",
  MANAGER: "Manajer",
  CASHIER: "Kasir",
  INVENTORY_STAFF: "Staf Gudang",
};

type UserMenuProps = {
  name: string;
  email: string;
  role: string;
};

export function UserMenu({ name, email, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
              <User className="size-3.5" aria-hidden="true" />
            </span>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium leading-tight text-foreground">{name}</span>
              <span className="block text-xs leading-tight text-muted-foreground">
                {ROLE_LABELS[role] ?? role}
              </span>
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate font-medium text-foreground">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
