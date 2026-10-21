import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await currentUser()) redirect(next);
  return (
    <div className="container narrow page-content">
      <LoginForm next={next} />
    </div>
  );
}
