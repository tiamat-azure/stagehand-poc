import "dotenv/config";
import type { V3Options } from "@browserbasehq/stagehand";

/**
 * Variables Browserbase explicitement interdites par le PRD (critere 1).
 * Le POC doit fonctionner sans compte Browserbase.
 */
const FORBIDDEN_BROWSERBASE_ENV = [
  "BROWSERBASE_API_KEY",
  "BROWSERBASE_PROJECT_ID",
] as const;

/** Modele Anthropic par defaut (surchargeable via STAGEHAND_MODEL). */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";

/** Requete YouTube par defaut (surchargeable via YOUTUBE_QUERY). */
export const DEFAULT_QUERY = "POE 2";

export const YOUTUBE_URL = "https://www.youtube.com/";

/**
 * Verifie que l'environnement est conforme au PRD :
 * - ANTHROPIC_API_KEY presente ;
 * - aucune variable Browserbase active.
 */
export function assertLocalOnlyEnvironment(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY n'est pas definie dans l'environnement. " +
        "Copiez .env.example vers .env puis renseignez votre cle Anthropic.",
    );
  }

  const leaked = FORBIDDEN_BROWSERBASE_ENV.filter((name) =>
    Boolean(process.env[name]?.trim()),
  );

  if (leaked.length > 0) {
    throw new Error(
      `Variables Browserbase detectees (${leaked.join(", ")}). ` +
        "Ce POC doit tourner en mode 100 % local : retirez-les de l'environnement.",
    );
  }

  return apiKey;
}

/** Requete de recherche YouTube effective. */
export function searchQuery(): string {
  return process.env.YOUTUBE_QUERY?.trim() || DEFAULT_QUERY;
}

/** Nom de modele Stagehand effectif. */
export function modelName(): string {
  return process.env.STAGEHAND_MODEL?.trim() || DEFAULT_MODEL;
}

/** Le POC est visible par defaut ; HEADLESS=1 permet un run CI. */
export function isHeadless(): boolean {
  return process.env.HEADLESS === "1";
}

/**
 * Construit les options Stagehand v3 pour un navigateur Chromium local.
 * `env: "LOCAL"` + `disableAPI: true` garantissent l'absence de session Browserbase.
 */
export function buildStagehandOptions(apiKey: string): V3Options {
  return {
    env: "LOCAL",
    disableAPI: true,
    localBrowserLaunchOptions: {
      headless: isHeadless(),
      viewport: { width: 1440, height: 900 },
      // Locale fixe : rend l'interface YouTube reproductible d'une machine a l'autre.
      locale: "en-US",
      args: ["--lang=en-US", "--disable-features=Translate"],
    },
    model: {
      modelName: modelName(),
      apiKey,
    },
    verbose: Number(process.env.STAGEHAND_VERBOSE ?? 1) as 0 | 1 | 2,
  };
}
