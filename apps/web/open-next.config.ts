import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: dummy in-memory caches (no KV/S3/R2 binding required).
export default defineCloudflareConfig();
