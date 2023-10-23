import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { normalizeRules } from "./externals.js";
import type { PackageJSON, StarbeamValue } from "./manifest.js";
import { GetPackageMeta } from "./package-meta.js";
import type {
  PackageInfo,
  StarbeamInfo,
  Strictness,
  StrictSettings as StrictSettingsInterface,
} from "./types.js";
import { parseJSON } from "./utils.js";

export class Package implements PackageInfo {
  static at(meta: ImportMeta | string): Package | undefined {
    return buildPackage(meta);
  }

  readonly #package: PackageInfo;

  constructor(pkg: PackageInfo) {
    this.#package = pkg;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const pkg = new (class Package {})();
    Object.defineProperties(
      pkg,
      Object.fromEntries(
        Object.entries(this.#package).map(([k, v]) => [
          k,
          { value: v as PackageInfo[keyof PackageInfo], enumerable: true },
        ]),
      ),
    );

    return pkg;
  }

  get entry(): string {
    return this.#package.entry;
  }

  get dependencies(): Record<string, string> {
    return this.#package.dependencies;
  }

  get name(): string {
    return this.#package.name;
  }

  get main(): string {
    return this.#package.main;
  }

  get root(): string {
    return this.#package.root;
  }

  get starbeam(): StarbeamInfo {
    return this.#package.starbeam;
  }
}

export function rootAt(meta: ImportMeta | string): string {
  return typeof meta === "string" ? meta : new URL(".", meta.url).pathname;
}

function buildPackage(importMeta: ImportMeta | string): Package | undefined {
  const root = typeof importMeta === "string" ? importMeta : rootAt(importMeta);

  const json: PackageJSON = parseJSON(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );

  const name = json.name;

  const meta = new GetPackageMeta(root, json);

  const inline = meta.map("inline", (rules) =>
    normalizeRules(rules, { package: name }),
  );

  const strict = meta.map("strict", (value) => new StrictSettings(root, value));

  const type = meta.map("type", (value) => {
    if (value !== undefined) {
      if (typeof value !== "string") {
        throw new Error(`Invalid starbeam:type: ${JSON.stringify(value)}`);
      }
      return value;
    }

    return json.private ? "library:private" : "library:public";
  });

  const jsx = meta.get("jsx");
  const source = meta.get("source");

  const entry = meta.map("entry", (entry) => {
    if (typeof entry === "string") {
      return { index: entry };
    } else if (typeof entry === "object") {
      return entry;
    } else {
      const main = json.main;

      if (main.endsWith(".ts")) {
        return { index: main };
      }

      if (existsSync(resolve(root, "src", "index.ts"))) {
        return { index: "src/index.ts" };
      }
    }
  });

  const mainEntry = entry?.["index"];

  if (mainEntry) {
    return new Package({
      name: json.name,
      main: json.main,
      entry: mainEntry,
      root,
      dependencies: json.dependencies ?? {},
      starbeam: {
        inline,
        strict,
        source,
        jsx,
        type,
        entry,
      },
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn(`No main entry point found for ${json.name} (in ${root})`);
  }
}

type StrictSettingsJson = StarbeamValue<"strict">;

class StrictSettings implements StrictSettingsInterface {
  #expanded: StrictSettingsInterface;

  constructor(root: string, original: StrictSettingsJson) {
    this.#expanded = expand(root, original);
  }

  get externals() {
    return this.#expanded.externals;
  }
}

type BuildStrictSettings = Partial<{
  -readonly [key in keyof StrictSettingsInterface]: StrictSettingsInterface[key];
}>;

function expand(
  root: string,
  strictness: StrictSettingsJson,
): StrictSettingsInterface {
  if (strictness === undefined) {
    return {
      externals: "allow",
    };
  }

  const leftover = new Set(["externals"] as const);

  const result: BuildStrictSettings = {};

  const entries = Object.entries(strictness) as [
    keyof StrictSettingsInterface | "all.v1",
    Strictness,
  ][];

  for (const [key, value] of entries) {
    if (key === "all.v1") {
      for (const key of leftover) {
        result[key] = verifyValue(root, key, value);
      }
      leftover.clear();
    } else {
      leftover.delete(key);

      result[key] = verifyValue(root, key, value);
    }
  }

  for (const key of leftover) {
    result[key] = "allow";
  }

  return result as StrictSettingsInterface;
}

function verifyValue(
  root: string,
  key: string,
  value: string,
): Strictness | undefined {
  switch (value) {
    case "allow":
    case "warn":
    case "error":
      return value;
    default:
      // eslint-disable-next-line no-console
      console.warn(
        [
          `Invalid value for strictness:${key} (${value}), falling back to "allow".`,
          `Strictness values should be one of "allow", "warn", or "error".`,
          `From: ${root}`,
        ].join("\n\n"),
      );
  }
}
