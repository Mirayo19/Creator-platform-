import type { ParsedPost } from "../import";

/**
 * Platform integration contract. Each platform implements this against its OFFICIAL API only.
 * Adding a platform = implement this interface + register it in ./index.ts. Nothing else changes.
 */
export interface PlatformIntegration {
  id: "x" | "linkedin";
  name: string;
  /** Env vars that must be set for the integration to work. */
  requiredEnv: string[];
  /** What the platform's API/program requires before this can work. */
  requirements: string;
  /** True when this adapter actually implements syncing (vs. scaffold only). */
  implemented: boolean;
  isConfigured(): boolean;
  /** OAuth authorisation URL (PKCE where supported). */
  getAuthUrl(state: string, redirectUri: string): string;
  /** Pull the user's own posts + metrics through the official API. */
  fetchPosts(accessToken: string): Promise<ParsedPost[]>;
}
