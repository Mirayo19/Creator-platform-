import type { PlatformIntegration } from "./types";

/**
 * X API v2 adapter (scaffold). Requires an X developer app with OAuth 2.0 and a paid API tier that
 * includes reading the user's own posts + non_public_metrics (impressions). OAuth callback, token
 * storage (platform_credentials, service-role only) and sync are NOT implemented yet.
 */
export const xIntegration: PlatformIntegration = {
  id: "x",
  name: "X / Twitter",
  requiredEnv: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  requirements:
    "An X developer app (OAuth 2.0) with an API access tier that allows reading your own posts and their non-public metrics. Until then, import via URL, paste or the CSV from X Analytics.",
  implemented: false,
  isConfigured: () => Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET),
  getAuthUrl(state, redirectUri) {
    const p = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "tweet.read users.read offline.access",
      state,
    });
    return `https://twitter.com/i/oauth2/authorize?${p}`;
  },
  async fetchPosts() {
    throw new Error("X sync is not implemented yet.");
  },
};
