import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Stagehand } from "@browserbasehq/stagehand";
import {
  BrowserSessionClosedError,
  isSessionClosed,
  keepBrowserOpen,
  requireActivePage,
} from "../src/lifecycle.js";

/** Fabrique un Stagehand factice expose uniquement via son getter `context`. */
function fakeStagehand(context: unknown): Stagehand {
  return { context } as unknown as Stagehand;
}

describe("requireActivePage", () => {
  it("retourne la premiere page du contexte", () => {
    const page = { url: () => "https://www.youtube.com/" };
    const stagehand = fakeStagehand({ pages: () => [page] });

    assert.equal(requireActivePage(stagehand), page);
  });

  it("signale une session fermee quand le contexte est detruit", () => {
    assert.throws(
      () => requireActivePage(fakeStagehand(null)),
      BrowserSessionClosedError,
    );
  });

  it("signale une session fermee quand il ne reste aucune page", () => {
    assert.throws(
      () => requireActivePage(fakeStagehand({ pages: () => [] })),
      BrowserSessionClosedError,
    );
  });
});

describe("isSessionClosed", () => {
  it("reconnait la garde maison", () => {
    assert.equal(isSessionClosed(new BrowserSessionClosedError()), true);
  });

  it("reconnait le StagehandNotInitializedError emis apres un arret force", () => {
    const error = new Error("You seem to be calling `act()` on a page...");
    error.name = "StagehandNotInitializedError";

    assert.equal(isSessionClosed(error), true);
  });

  it("laisse passer une erreur applicative ordinaire", () => {
    assert.equal(isSessionClosed(new Error("Champ introuvable")), false);
  });

  it("tolere une valeur levee non-Error", () => {
    assert.equal(isSessionClosed("boom"), false);
  });
});

describe("keepBrowserOpen", () => {
  it("laisse le navigateur ouvert par defaut", () => {
    delete process.env.KEEP_OPEN;
    assert.equal(keepBrowserOpen(), true);
  });

  it("ferme le navigateur avec KEEP_OPEN=0", () => {
    process.env.KEEP_OPEN = "0";
    try {
      assert.equal(keepBrowserOpen(), false);
    } finally {
      delete process.env.KEEP_OPEN;
    }
  });
});
