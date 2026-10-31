import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

// Vercel runs api/ as native ESM ("type": "module"), which cannot resolve
// extensionless relative imports. tsx, Vite and vitest all can, so local and
// CI runs would not notice; this test does.
const apiDir = path.resolve(__dirname, "../../api");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

test("api/ relative imports carry a .js extension", () => {
  const offenders = listSourceFiles(apiDir).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
      .map((match) => match[1])
      .filter((specifier) => !specifier.endsWith(".js"))
      .map((specifier) => `${path.relative(apiDir, file)}: ${specifier}`);
  });

  expect(offenders).toEqual([]);
});
