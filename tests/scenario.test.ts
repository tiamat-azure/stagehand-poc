import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isWatchUrl } from "../src/scenario.js";

describe("isWatchUrl", () => {
  it("reconnait une page de lecture classique", () => {
    assert.equal(isWatchUrl("https://www.youtube.com/watch?v=abc123"), true);
  });

  it("reconnait un short", () => {
    assert.equal(isWatchUrl("https://www.youtube.com/shorts/abc123"), true);
  });

  it("rejette la page d'accueil", () => {
    assert.equal(isWatchUrl("https://www.youtube.com/"), false);
  });

  it("rejette une page de resultats de recherche", () => {
    assert.equal(
      isWatchUrl("https://www.youtube.com/results?search_query=POE2"),
      false,
    );
  });

  it("rejette une URL vide", () => {
    assert.equal(isWatchUrl(""), false);
  });
});
