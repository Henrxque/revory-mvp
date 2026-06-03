import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      shortCircuit: true,
      url: "data:text/javascript,export default undefined;",
    };
  }

  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    const candidates = [
      path.join(projectRoot, `${relativePath}.ts`),
      path.join(projectRoot, `${relativePath}.tsx`),
      path.join(projectRoot, relativePath, "index.ts"),
      path.join(projectRoot, relativePath, "index.tsx"),
    ];
    const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (resolvedPath) {
      return {
        shortCircuit: true,
        url: pathToFileURL(resolvedPath).href,
      };
    }
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const parentDir = path.dirname(parentPath);
    const relativeTarget = path.resolve(parentDir, specifier);
    const candidates = [
      `${relativeTarget}.ts`,
      `${relativeTarget}.tsx`,
      path.join(relativeTarget, "index.ts"),
      path.join(relativeTarget, "index.tsx"),
    ];
    const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (resolvedPath) {
      return {
        shortCircuit: true,
        url: pathToFileURL(resolvedPath).href,
      };
    }
  }

  return nextResolve(specifier, context);
}
