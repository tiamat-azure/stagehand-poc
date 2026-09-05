import { Stagehand } from "@browserbasehq/stagehand";
import {
  assertLocalOnlyEnvironment,
  buildStagehandOptions,
  isHeadless,
  modelName,
  searchQuery,
} from "./config.js";
import { holdUntilShutdown } from "./lifecycle.js";
import { runYoutubeScenario } from "./scenario.js";

async function main(): Promise<void> {
  const apiKey = assertLocalOnlyEnvironment();
  const query = searchQuery();

  console.log("Stagehand v3 - POC navigateur local");
  console.log(`  scenario       : deterministe (observe/act cibles)`);
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

    await holdUntilShutdown();
  } finally {
    await stagehand.close();
  }
}

main().catch((error: unknown) => {
  console.error("\nEchec du scenario :");
  console.error(error);
  process.exit(1);
});
