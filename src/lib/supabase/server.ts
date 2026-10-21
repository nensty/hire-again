import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicConfig } from "../env";
export async function supabaseServer() {
  const config = publicConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Server component refresh is handled by proxy. */
        }
      },
    },
  });
}
export async function currentUser() {
  const client = await supabaseServer();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
