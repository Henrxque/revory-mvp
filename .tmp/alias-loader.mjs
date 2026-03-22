import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();

function resolveAliasTarget(specifier) {
  const relativePath = specifier.slice(2);
  const absoluteBasePath = path.join(projectRoot, relativePath);
  const candidates = [
    absoluteBasePath,
    `${absoluteBasePath}.ts`,
    `${absoluteBasePath}.tsx`,
    `${absoluteBasePath}.js`,
    `${absoluteBasePath}.mjs`,
    path.join(absoluteBasePath, "index.ts"),
    path.join(absoluteBasePath, "index.tsx"),
    path.join(absoluteBasePath, "index.js"),
    path.join(absoluteBasePath, "index.mjs"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export default undefined;",
    };
  }

  if (specifier.startsWith("@/")) {
    const targetPath = resolveAliasTarget(specifier);

    if (!targetPath) {
      throw new Error(`Could not resolve alias target for ${specifier}`);
    }

    return defaultResolve(pathToFileURL(targetPath).href, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}
