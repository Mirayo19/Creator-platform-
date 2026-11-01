import { linkedinIntegration } from "./linkedin";
import { xIntegration } from "./x";
import type { PlatformIntegration } from "./types";

export const integrations: PlatformIntegration[] = [xIntegration, linkedinIntegration];

export function integrationStatus() {
  return integrations.map((i) => ({
    id: i.id,
    name: i.name,
    requirements: i.requirements,
    requiredEnv: i.requiredEnv,
    credentialsPresent: i.isConfigured(),
    implemented: i.implemented,
  }));
}
