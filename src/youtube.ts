import { Stagehand } from "@browserbasehq/stagehand";
import {
  assertLocalOnlyEnvironment,
  buildStagehandOptions,
  isHeadless,
  modelName,
  searchQuery,
} from "./config.js";
import { runYoutubeScenario } from "./scenario.js";

/**
 * Maintient le processus vivant jusqu'a SIGINT/SIGTERM.
 * Permet a `make stop` de fermer le navigateur a la demande.
 */
function waitForShutdownSignal(): Promise<NodeJS.Signals> {
  return new Promise((resolve) => {
    const onSignal = (signal: NodeJS.Signals) => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      resolve(signal);
    };
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  });
}

async function main(): Promise<void> {
  const apiKey = assertLocalOnlyEnvironment();
  const query = searchQuery();
  const keepOpen = process.env.KEEP_OPEN !== "0";

  console.log("Stagehand v3 - POC navigateur local");
  console.log(`  env            : LOCAL (disableAPI: true)`);
  console.log(`  modele         : ${modelName()}`);
  console.log(`  headless       : ${isHeadless()}`);
  console.log(`  requete        : ${query}`);

  const stagehand = new Stagehand(buildStagehandOptions(apiKey));
  await stagehand.init();

  try {
    const result = await runYoutubeScenario(stagehand, query);

    console.log("\nNavigation terminee.");
    console.log(`  URL finale : ${result.finalUrl}`);
    console.log(`  Titre      : ${result.title}`);
    console.log(`  Lecture    : ${result.isWatchPage ? "OK" : "NON CONFIRMEE"}`);

    if (!result.isWatchPage) {
      throw new Error(
        `La page finale n'est pas une page de lecture YouTube : ${result.finalUrl}`,
      );
    }

    if (keepOpen) {
      console.log(
        "\nNavigateur laisse ouvert. Utilisez `make stop` (ou Ctrl+C) pour le fermer.",
      );
      const signal = await waitForShutdownSignal();
      console.log(`\nSignal ${signal} recu, fermeture du navigateur.`);
    }
  } finally {
    await stagehand.close();
  }
}

main().catch((error: unknown) => {
  console.error("\nEchec du scenario :");
  console.error(error);
  process.exit(1);
});
