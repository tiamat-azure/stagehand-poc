/**
 * Utilitaires de cycle de vie partages par les deux points d'entree
 * (`youtube.ts` et `youtube-agent.ts`).
 */

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
