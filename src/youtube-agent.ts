/**
 * Variante agentique du POC (section 11 du PRD).
 *
 * Contrairement a `youtube.ts` (goto -> observe -> act, deterministe et
 * diagnosticable), cette variante delegue l'integralite du scenario a la
 * boucle agentique Stagehand. Elle sert de preuve de faisabilite pour
 * l'evolution decrite en section 17.
 *
 * Meme contrat de sortie que la voie principale : verification de la page de
 * lecture, respect de `KEEP_OPEN`, code de sortie non nul en cas d'echec.
 */
import { Stagehand } from "@browserbasehq/stagehand";
import {
  assertLocalOnlyEnvironment,
  buildStagehandOptions,
  isHeadless,
  modelName,
  searchQuery,
  YOUTUBE_URL,
} from "./config.js";
import { holdUntilShutdown } from "./lifecycle.js";
import { isWatchUrl } from "./scenario.js";

/** Garde-fou : nombre maximal d'etapes accordees a la boucle agentique. */
const MAX_STEPS = 15;

async function main(): Promise<void> {
  const apiKey = assertLocalOnlyEnvironment();
  const query = searchQuery();

  console.log("Stagehand v3 - POC navigateur local");
  console.log(`  scenario       : agentique (boucle Stagehand, PRD section 11)`);
  console.log(`  env            : LOCAL (disableAPI: true)`);
  console.log(`  modele         : ${modelName()}`);
  console.log(`  headless       : ${isHeadless()}`);
  console.log(`  requete        : ${query}`);

  const stagehand = new Stagehand(buildStagehandOptions(apiKey));
  await stagehand.init();

  try {
    const agent = stagehand.agent({
      model: {
        modelName: modelName(),
        apiKey,
      },
    });

    const result = await agent.execute({
      instruction: [
        `Go to ${YOUTUBE_URL}`,
        "Dismiss the cookie consent dialog if one appears.",
        `Search for "${query}" in the YouTube search box.`,
        "Press Enter to run the search.",
        "Open the first real video in the search results (skip ads and shorts shelves).",
      ].join("\n"),
      maxSteps: MAX_STEPS,
    });

    const page = stagehand.context.pages()[0];
    const finalUrl = page?.url() ?? "";
    const isWatchPage = isWatchUrl(finalUrl);

    console.log("\nAgent termine.");
    console.log(`  succes     : ${result.success}`);
    console.log(`  message    : ${result.message}`);
    console.log(`  URL finale : ${finalUrl || "n/a"}`);
    console.log(`  Lecture    : ${isWatchPage ? "OK" : "NON CONFIRMEE"}`);

    if (!result.success) {
      throw new Error(`La boucle agentique a echoue : ${result.message}`);
    }

    if (!isWatchPage) {
      throw new Error(
        `La page finale n'est pas une page de lecture YouTube : ${finalUrl || "n/a"}`,
      );
    }

    await holdUntilShutdown();
  } finally {
    await stagehand.close();
  }
}

main().catch((error: unknown) => {
  console.error("\nEchec de la variante agentique :");
  console.error(error);
  process.exit(1);
});
