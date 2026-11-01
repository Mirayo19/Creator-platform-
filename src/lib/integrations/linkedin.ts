import type { PlatformIntegration } from "./types";

/**
 * LinkedIn adapter (scaffold). LinkedIn only exposes member post analytics to approved partner
 * programs, so for now creators import by pasting text or uploading analytics exports.
 */
export const linkedinIntegration: PlatformIntegration = {
  id: "linkedin",
  name: "LinkedIn",
  requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  requirements:
    "LinkedIn restricts reading member posts/analytics to approved API programs. Until approved, paste posts or upload your LinkedIn analytics export (CSV).",
  implemented: false,
  isConfigured: () => Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
  getAuthUrl(state, redirectUri) {
    const p = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "openid profile",
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${p}`;
  },
  async fetchPosts() {
    throw new Error("LinkedIn sync is not implemented yet.");
  },
};
