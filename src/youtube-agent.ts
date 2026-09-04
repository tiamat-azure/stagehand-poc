/**
 * Variante agentique du POC (section 11 du PRD).
 *
 * Contrairement a `youtube.ts` (goto -> observe -> act, deterministe et
 * diagnosticable), cette variante delegue l'integralite du scenario a la
 * boucle agentique Stagehand. Elle sert de preuve de faisabilite pour
 * l'evolution decrite en section 17.
 */
import { Stagehand } from "@browserbasehq/stagehand";
import {
  assertLocalOnlyEnvironment,
  buildStagehandOptions,
  modelName,
  searchQuery,
  YOUTUBE_URL,
} from "./config.js";

async function main(): Promise<void> {
  const apiKey = assertLocalOnlyEnvironment();
  const query = searchQuery();

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
      maxSteps: 15,
    });

    const page = stagehand.context.pages()[0];
    console.log("\nAgent termine.");
    console.log(`  succes     : ${result.success}`);
    console.log(`  message    : ${result.message}`);
    console.log(`  URL finale : ${page?.url() ?? "n/a"}`);
  } finally {
    await stagehand.close();
  }
}

main().catch((error: unknown) => {
  console.error("\nEchec de la variante agentique :");
  console.error(error);
  process.exit(1);
});
