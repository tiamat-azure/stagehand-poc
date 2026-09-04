/**
 * Section 14 du PRD : verifier que le code source n'exige aucun compte
 * Browserbase. Le test echoue si un fichier source reintroduit une
 * dependance a l'infrastructure distante.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

const sourceFiles = readdirSync(SRC)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => ({ name, content: readFileSync(join(SRC, name), "utf8") }));

describe("absence de dependance Browserbase", () => {
  it("trouve des fichiers source a analyser", () => {
    assert.ok(sourceFiles.length > 0);
  });

  for (const { name, content } of sourceFiles) {
    it(`${name} n'active pas env: "BROWSERBASE"`, () => {
      assert.doesNotMatch(content, /env\s*:\s*["']BROWSERBASE["']/);
    });

    it(`${name} ne lit pas de credentials Browserbase`, () => {
      assert.doesNotMatch(
        content,
        /process\.env\.(BROWSERBASE_API_KEY|BROWSERBASE_PROJECT_ID)/,
      );
    });
  }

  it(".env.example ne definit aucune variable Browserbase", () => {
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    const assignments = example
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");

    assert.doesNotMatch(assignments, /BROWSERBASE_/);
    assert.match(assignments, /ANTHROPIC_API_KEY=/);
  });
});
