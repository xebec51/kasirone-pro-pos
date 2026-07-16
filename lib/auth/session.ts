import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function getSession() {
  return getServerSession(authOptions);
}

/** JWT-derived identity only — no DB freshness guarantee. Use requireStoreMember() for authorization. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}

export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
