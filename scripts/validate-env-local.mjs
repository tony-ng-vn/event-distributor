/**
 * Validate required keys in a .env.local file.
 */
import { existsSync, readFileSync } from "node:fs";

const REQUIRED_KEYS = [
  "INSFORGE_URL",
  "INSFORGE_API_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const RECOMMENDED_KEYS = [
  "NEXT_PUBLIC_INSFORGE_URL",
  "NEXT_PUBLIC_INSFORGE_ANON_KEY",
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    values[key] = value;
  }
  return values;
}

export function findMissingEnvKeys(path) {
  const values = parseEnvFile(path);
  const missingRequired = REQUIRED_KEYS.filter((key) => !values[key]?.trim());
  const missingRecommended = RECOMMENDED_KEYS.filter((key) => !values[key]?.trim());
  return { missingRequired, missingRecommended, values };
}

export function printMissingEnvHelp({ envPath, missingRequired, missingRecommended }) {
  console.error("");
  console.error(".env.local exists but required keys are still empty.");
  console.error(`Edit: ${envPath}`);
  console.error("");
  console.error("Missing required:");
  for (const key of missingRequired) {
    console.error(`  - ${key}`);
  }
  if (missingRecommended.length > 0) {
    console.error("");
    console.error("Recommended:");
    for (const key of missingRecommended) {
      console.error(`  - ${key}`);
    }
  }
  console.error("");
  console.error("Where to get values:");
  console.error("  Clerk: dashboard.clerk.com → your app → API Keys");
  console.error("  InsForge: npx @insforge/cli link && npx @insforge/cli current --json");
  console.error(`  Then re-run from worktree: npm run worktree:setup`);
}
