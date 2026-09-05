/**
 * Utilitaires de cycle de vie partages par les deux points d'entree
 * (`youtube.ts` et `youtube-agent.ts`).
 */
import type { Page, Stagehand } from "@browserbasehq/stagehand";

/**
 * Levee lorsque la session navigateur disparait en cours de scenario :
 * fenetre fermee a la main, `make stop`, ou arret de Chrome.
 *
 * Stagehand reagit a la fermeture du transport CDP en detruisant son contexte
 * (`context` passe a `null` malgre un type declare non-nullable). Sans cette
 * garde, l'acces suivant echoue sur un `TypeError: Cannot read properties of
 * null (reading 'pages')` qui ne dit rien de la cause reelle.
 */
export class BrowserSessionClosedError extends Error {
  constructor() {
    super(SESSION_CLOSED_MESSAGE);
    this.name = "BrowserSessionClosedError";
  }
}

/** Explication unique de la disparition de la session, quel qu'en soit le signal. */
const SESSION_CLOSED_MESSAGE =
  "La session navigateur a ete fermee pendant l'execution " +
  "(fenetre fermee manuellement, `make stop`, ou arret de Chrome).";

/**
 * Reconnait les erreurs qui traduisent en realite une session disparue.
 *
 * Quand le transport CDP se ferme, Stagehand remet ses handlers a `null`, puis
 * signale les appels suivants par un `StagehandNotInitializedError` invitant a
 * appeler `init()`. Ce diagnostic est trompeur : nos points d'entree
 * n'utilisent Stagehand qu'apres un `init()` reussi, donc ce message ne peut
 * designer qu'une session interrompue en cours de scenario.
 */
export function isSessionClosed(error: unknown): boolean {
  if (error instanceof BrowserSessionClosedError) return true;

  return (
    error instanceof Error && error.name === "StagehandNotInitializedError"
  );
}

/**
 * Retourne la page active du contexte Stagehand.
 * @throws {BrowserSessionClosedError} si la session navigateur n'existe plus.
 */
export function requireActivePage(stagehand: Stagehand): Page {
  // Le getter est type non-nullable par la librairie mais vaut `null` apres
  // un arret force : on retablit la verite du terrain avant de deferencer.
  const context = stagehand.context as Stagehand["context"] | null;
  const page = context?.pages()[0];
  if (!page) throw new BrowserSessionClosedError();

  return page;
}

/** Vrai si `KEEP_OPEN` demande de laisser le navigateur ouvert (defaut). */
export function keepBrowserOpen(): boolean {
  return process.env.KEEP_OPEN !== "0";
}

/**
 * Maintient le processus vivant jusqu'a SIGINT/SIGTERM.
 * Permet a `make stop` de fermer le navigateur a la demande.
 */
export function waitForShutdownSignal(): Promise<NodeJS.Signals> {
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

/**
 * Bloque jusqu'au signal d'arret si `KEEP_OPEN` le demande.
 * Ne fait rien lorsque `KEEP_OPEN=0` (runs headless / CI).
 */
export async function holdUntilShutdown(): Promise<void> {
  if (!keepBrowserOpen()) return;

  console.log(
    "\nNavigateur laisse ouvert. Utilisez `make stop` (ou Ctrl+C) pour le fermer.",
  );
  const signal = await waitForShutdownSignal();
  console.log(`\nSignal ${signal} recu, fermeture du navigateur.`);
}

/**
 * Journalise un echec et termine le processus en code 1.
 *
 * Une session fermee volontairement n'est pas un bug du scenario : on affiche
 * alors un message court, sans pile d'appels.
 *
 * @param scenario Libelle du scenario, par ex. `"Variante agentique"`.
 */
export function reportFailure(scenario: string, error: unknown): never {
  if (isSessionClosed(error)) {
    console.error(`\n${scenario} - interruption : ${SESSION_CLOSED_MESSAGE}`);
  } else {
    console.error(`\n${scenario} - echec :`);
    console.error(error);
  }
  process.exit(1);
}
