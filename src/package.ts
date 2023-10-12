import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { PackageJSON, StarbeamValue } from "#/manifest";

import { normalizeRules } from "./externals.js";
import { getPackageMeta } from "./package-meta.js";
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

function buildPackage(meta: ImportMeta | string): Package | undefined {
  const root = typeof meta === "string" ? meta : rootAt(meta);

  const json: PackageJSON = parseJSON(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );

  const name = json.name;

  const inline = getPackageMeta(root, json, "inline", (rules) =>
    normalizeRules(rules, { package: name }),
  );

  const strict = getPackageMeta(
    root,
    json,
    "strict",
    (value) => new StrictSettings(root, value),
  );

  const type = getPackageMeta(root, json, "type", (value) => {
    if (typeof value !== "string") {
      throw new Error(`Invalid starbeam:type: ${JSON.stringify(value)}`);
    }
    return value;
  });

  let jsx: string | undefined;

  if (json["starbeam:jsx"]) {
    jsx = json["starbeam:jsx"];
  } else if (json.starbeam?.jsx) {
    jsx = json.starbeam.jsx;
  }

  let source: string | undefined;

  if (json["starbeam:source"]) {
    source = json["starbeam:source"];
  } else {
    source = json.starbeam?.source;
  }

  let rawEntry: Record<string, string> | string | undefined;

  if (json["starbeam:entry"]) {
    rawEntry = json["starbeam:entry"];
  } else if (json.starbeam?.entry) {
    rawEntry = json.starbeam.entry;
  } else {
    rawEntry = undefined;
  }

  let entry: Record<string, string>;

  if (typeof rawEntry === "string") {
    entry = { index: rawEntry };
  } else if (typeof rawEntry === "object") {
    entry = rawEntry;
  } else {
    entry = { index: json.main };
  }

  if (json.main) {
    return new Package({
      name: json.name,
      main: resolve(root, json.main),
      root,
      starbeam: {
        inline,
        strict,
        source,
        jsx,
        type,
        entry,
      },
    });
  } else if (
    json["starbeam:type"] === "draft" ||
    json.starbeam?.type === "draft"
  ) {
    // do nothing
  } else {
    // eslint-disable-next-line no-console
    console.warn(`No main entry point found for ${json.name} (in ${root})`);
  }
}

type StrictSettingsJson = StarbeamValue<"strict">;

/**
 * @typedef {import("#/types").StrictSettings} StrictSettingsInterface
 * @typedef {import("#/manifest").StarbeamValue<"strict">} StrictSettingsJson
 */

/**
 * @implements {StrictSettingsInterface}
 */
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
