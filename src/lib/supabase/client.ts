"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "./config";

export function createBrowserSupabaseClient() {
  const config = getSupabaseBrowserConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}
