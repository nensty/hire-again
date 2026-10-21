import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
import { siteUrl } from "@/lib/env";
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const client = await supabaseServer();
  let ok = false;
  if (client) {
    try {
      if (p.get("code")) {
        const { error } = await client.auth.exchangeCodeForSession(
          p.get("code")!,
        );
        ok = !error;
      } else if (p.get("token_hash") && p.get("type") === "email") {
        const { error } = await client.auth.verifyOtp({
          token_hash: p.get("token_hash")!,
          type: "email",
        });
        ok = !error;
      }
    } catch {
      ok = false;
    }
  }
  const response = NextResponse.redirect(
    new URL(ok ? safeNext(p.get("next")) : "/auth/error", siteUrl()),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
