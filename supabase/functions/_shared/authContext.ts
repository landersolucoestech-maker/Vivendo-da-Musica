import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resolves the caller's identity from their JWT and returns a Supabase
 * client scoped to that same JWT (so any query made with it is still
 * subject to the caller's own RLS — it never bypasses authorization).
 */
export async function getAuthContext(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Response("Missing Authorization header", { status: 401 });
  }

  const supabaseUserClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabaseUserClient.auth.getUser();
  if (error || !data.user) {
    throw new Response("Invalid or expired session", { status: 401 });
  }

  return { userId: data.user.id, supabaseUserClient };
}
