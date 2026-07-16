"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Owner", email: "owner@kasirone.demo" },
  { label: "Manager", email: "manager@kasirone.demo" },
  { label: "Kasir", email: "cashier@kasirone.demo" },
  { label: "Inventaris", email: "inventory@kasirone.demo" },
];
const DEMO_PASSWORD = "Password123!";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function fillDemoAccount(email: string) {
    form.setValue("email", email);
    form.setValue("password", DEMO_PASSWORD);
    setServerError(null);
  }

  function onSubmit(values: LoginValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        setServerError("Email atau password salah.");
        return;
      }

      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="nama@toko.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {serverError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {serverError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </Form>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Akun demo (password: <span className="font-mono">{DEMO_PASSWORD}</span>)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemoAccount(account.email)}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
