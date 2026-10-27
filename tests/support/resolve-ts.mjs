// Lets node:test load the TypeScript sources the way the bundlers do:
// - `./x.js` resolves to `./x.ts` (api/ and shared/ must use .js suffixes; Vercel's runtime needs them)
// - extension-less relative imports resolve to `.ts`
// - `@/x` resolves to `src/x` (the Vite alias)
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = new URL("../../src/", import.meta.url);

function candidates(url) {
  const path = fileURLToPath(url);
  return path.endsWith(".js")
    ? [path.slice(0, -3) + ".ts"]
    : [`${path}.ts`, `${path}/index.ts`];
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isAlias = specifier.startsWith("@/");
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!isAlias && !isRelative) {
      return nextResolve(specifier, context);
    }

    const url = isAlias
      ? new URL(specifier.slice(2), srcRoot)
      : new URL(specifier, context.parentURL);
    if (existsSync(fileURLToPath(url))) {
      return nextResolve(isAlias ? url.href : specifier, context);
    }

    const match = candidates(url).find((candidate) => existsSync(candidate));
    return match
      ? nextResolve(pathToFileURL(match).href, context)
      : nextResolve(specifier, context);
  },
});
