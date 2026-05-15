import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdminConfig, getSupabaseBrowserConfig } from "./config";

export function createServerSupabaseClient() {
  const config = getSupabaseBrowserConfig();
  if (!config) return null;
  const cookieStore = cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components cannot set cookies. Route handlers can.
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Server Components cannot set cookies. Route handlers can.
        }
      }
    }
  });
}

export function createAdminSupabaseClient() {
  const config = getSupabaseAdminConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
