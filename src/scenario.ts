import { Stagehand } from "@browserbasehq/stagehand";
import type { Page } from "@browserbasehq/stagehand";
import { YOUTUBE_URL } from "./config.js";

export interface ScenarioResult {
  /** URL finale du navigateur apres ouverture de la video. */
  finalUrl: string;
  /** Titre de la page finale. */
  title: string;
  /** Vrai si l'URL finale est bien une page de lecture YouTube. */
  isWatchPage: boolean;
}

/** Attribut temporaire pose sur le bouton de consentement pour le cibler. */
const CONSENT_MARKER = "data-poc-consent";

/** Duree max de sondage de la banniere de consentement. */
const CONSENT_POLL_TIMEOUT_MS = 8000;

/** Libelles du bouton "tout accepter" dans les locales les plus courantes. */
const CONSENT_LABELS =
  "accept all|tout accepter|alle akzeptieren|aceptar todo|accetta tutto|alles accepteren";

const step = (n: number, label: string): void => {
  console.log(`\n[etape ${n}] ${label}`);
};

/**
 * Sonde la page jusqu'a `timeoutMs` a la recherche du bouton "tout accepter"
 * et le marque pour permettre un clic par selecteur. Retourne false si aucun
 * bouton connu n'apparait dans le delai imparti.
 */
async function markConsentButton(
  page: Page,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  do {
    const marked = await page.evaluate<boolean, string>((labels) => {
      const pattern = new RegExp(labels, "i");
      const button = Array.from(
        document.querySelectorAll<HTMLElement>("button, [role=button]"),
      ).find((element) =>
        pattern.test(
          `${element.textContent ?? ""} ${element.getAttribute("aria-label") ?? ""}`,
        ),
      );
      if (!button) return false;
      button.setAttribute("data-poc-consent", "1");
      return true;
    }, CONSENT_LABELS);

    if (marked) return true;
    await page.waitForTimeout(400);
  } while (Date.now() < deadline);

  return false;
}

/**
 * Accepte la banniere de consentement YouTube si elle est affichee.
 *
 * Deux passes : un sondage deterministe par libelle (gratuit, sans appel LLM),
 * puis un repli sur `observe()` si la locale n'est pas couverte. L'absence de
 * banniere n'est pas une erreur.
 */
async function dismissConsentIfPresent(
  stagehand: Stagehand,
  page: Page,
): Promise<void> {
  // La banniere est injectee apres le premier rendu : on sonde plutot que
  // de parier sur un unique delai fixe.
  const marked = await markConsentButton(page, CONSENT_POLL_TIMEOUT_MS);

  if (marked) {
    console.log("  banniere de consentement detectee (selecteur deterministe)");
    await page.locator(`[${CONSENT_MARKER}="1"]`).click();
  } else {
    const actions = await stagehand.observe(
      "the button that accepts all cookies in the consent dialog, if such a dialog is visible",
    );
    if (actions.length === 0) return;

    console.log("  banniere de consentement detectee (observe)");
    await stagehand.act(actions[0]!);
  }

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
}

/**
 * Deroule le scenario du PRD :
 * goto YouTube -> saisie de la requete -> Entree -> ouverture de la 1re video.
 *
 * Les etapes deterministes utilisent l'API navigateur directement ;
 * seule la localisation des elements instables (champ de recherche, premier
 * resultat) passe par le LLM via `observe()` / `act()`.
 */
export async function runYoutubeScenario(
  stagehand: Stagehand,
  query: string,
): Promise<ScenarioResult> {
  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("Aucune page disponible dans le contexte Stagehand.");
  }

  step(1, `Ouverture deterministe de ${YOUTUBE_URL}`);
  await page.goto(YOUTUBE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  step(2, "Verification de la banniere de consentement");
  await dismissConsentIfPresent(stagehand, page);

  step(3, "Localisation du champ de recherche YouTube (observe)");
  const searchBoxActions = await stagehand.observe(
    "the YouTube search input field in the header at the top of the page",
  );
  if (searchBoxActions.length === 0) {
    throw new Error("Champ de recherche YouTube introuvable.");
  }
  console.log(`  ${searchBoxActions.length} candidat(s), selection du premier`);

  step(4, `Saisie de la requete "${query}"`);
  await stagehand.act(searchBoxActions[0]!);
  await page.type(query, { delay: 60 });

  step(5, "Validation de la recherche avec Entree");
  await page.keyPress("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  step(6, "Selection de la premiere video des resultats");
  await stagehand.act(
    "click the title link of the very first video in the search results list, " +
      "ignoring ads, shorts shelves and channel entries",
  );

  step(7, "Attente du chargement de la page de lecture");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  const title = await page.title();

  return {
    finalUrl,
    title,
    isWatchPage: /youtube\.com\/(watch|shorts)/.test(finalUrl),
  };
}
