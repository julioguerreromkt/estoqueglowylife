import { createClient } from "@supabase/supabase-js";

/** Cliente com a chave de serviço. Só no servidor, só para gestão de usuários. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
