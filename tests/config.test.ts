import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  assertLocalOnlyEnvironment,
  buildStagehandOptions,
  DEFAULT_MODEL,
  DEFAULT_QUERY,
  modelName,
  searchQuery,
} from "../src/config.js";

const SAVED = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in SAVED)) delete process.env[key];
  }
  Object.assign(process.env, SAVED);
});

describe("assertLocalOnlyEnvironment", () => {
  it("retourne la cle Anthropic quand l'environnement est valide", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    delete process.env.BROWSERBASE_API_KEY;
    delete process.env.BROWSERBASE_PROJECT_ID;

    assert.equal(assertLocalOnlyEnvironment(), "sk-ant-test");
  });

  it("echoue si ANTHROPIC_API_KEY est absente", () => {
    delete process.env.ANTHROPIC_API_KEY;

    assert.throws(assertLocalOnlyEnvironment, /ANTHROPIC_API_KEY/);
  });

  it("echoue si ANTHROPIC_API_KEY est vide", () => {
    process.env.ANTHROPIC_API_KEY = "   ";

    assert.throws(assertLocalOnlyEnvironment, /ANTHROPIC_API_KEY/);
  });

  it("echoue si une variable Browserbase est definie", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.BROWSERBASE_API_KEY = "bb-test";

    assert.throws(assertLocalOnlyEnvironment, /BROWSERBASE_API_KEY/);
  });

  it("echoue si BROWSERBASE_PROJECT_ID est defini", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.BROWSERBASE_PROJECT_ID = "proj-test";

    assert.throws(assertLocalOnlyEnvironment, /BROWSERBASE_PROJECT_ID/);
  });
});

describe("valeurs par defaut", () => {
  it("utilise la requete du PRD par defaut", () => {
    delete process.env.YOUTUBE_QUERY;

    assert.equal(searchQuery(), DEFAULT_QUERY);
    assert.equal(DEFAULT_QUERY, "POE2");
  });

  it("respecte YOUTUBE_QUERY", () => {
    process.env.YOUTUBE_QUERY = "lofi girl";

    assert.equal(searchQuery(), "lofi girl");
  });

  it("utilise un modele Anthropic par defaut", () => {
    delete process.env.STAGEHAND_MODEL;

    assert.equal(modelName(), DEFAULT_MODEL);
    assert.ok(DEFAULT_MODEL.startsWith("anthropic/"));
  });
});

describe("buildStagehandOptions", () => {
  it("force le mode local sans API Browserbase", () => {
    const options = buildStagehandOptions("sk-ant-test");

    assert.equal(options.env, "LOCAL");
    assert.equal(options.disableAPI, true);
    assert.equal(options.apiKey, undefined);
    assert.equal(options.projectId, undefined);
    assert.equal(options.browserbaseSessionID, undefined);
  });

  it("lance un navigateur visible par defaut", () => {
    delete process.env.HEADLESS;

    assert.equal(buildStagehandOptions("sk-ant-test").localBrowserLaunchOptions?.headless, false);
  });

  it("permet un run headless via HEADLESS=1", () => {
    process.env.HEADLESS = "1";

    assert.equal(buildStagehandOptions("sk-ant-test").localBrowserLaunchOptions?.headless, true);
  });

  it("transmet la cle Anthropic au modele", () => {
    const options = buildStagehandOptions("sk-ant-test");

    assert.deepEqual(options.model, {
      modelName: DEFAULT_MODEL,
      apiKey: "sk-ant-test",
    });
  });
});
