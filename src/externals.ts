import type {
  ExternalConfig,
  InlineRules,
  NormalizedExternalOption,
} from "./types";

const HELPERS = ["@babel/runtime/*", "tslib", "@swc/core"];

export function normalizeRules(
  rules: InlineRules | undefined,
  { package: packageName }: { package: string },
): NormalizedExternalOption[] {
  const normalized: NormalizedExternalOption[] = [];

  if (rules !== undefined) {
    if (Array.isArray(rules)) {
      return rules.flatMap((rule) =>
        normalizeRule(rule, { defaultConfig: "inline", packageName }),
      );
    } else {
      return Object.entries(rules).flatMap(([name, config]) => {
        return normalizeRule(name, { defaultConfig: config, packageName });
      });
    }
  }

  // By default, the built-in helpers are inlined. Add this last so that the
  // user's configuration takes precedence.
  normalized.push(
    ...HELPERS.flatMap((helper) =>
      normalizeLeaf(helper, "inline", packageName),
    ),
  );

  normalized.push(...normalizeLeaf("(scope)", "external", packageName));

  return normalized;
}

function normalizeRule(
  rule: import("./types").InlineRule,
  {
    defaultConfig = "inline",
    packageName,
  }: {
    defaultConfig?: ExternalConfig | undefined;
    packageName: string;
  },
): NormalizedExternalOption[] {
  if (typeof rule === "string") {
    return normalizeLeaf(rule, defaultConfig, packageName);
  } else {
    return Object.entries(rule).flatMap(([name, config]) =>
      normalizeLeaf(name, config, packageName),
    );
  }
}

function normalizeLeaf(
  name: string,
  config: ExternalConfig,
  packageName: string,
): NormalizedExternalOption[] {
  if (name.endsWith("*")) {
    return [["startsWith", removeLast(name), config]];
  } else if (name === "(helpers)") {
    return HELPERS.flatMap((helper) =>
      normalizeLeaf(helper, config, packageName),
    );
  } else if (name === "(scope)") {
    const scope = /^(@[^/]+\/)/.exec(packageName);
    if (!scope) return [];
    const [_, scopeName] = scope as RegExpExecArray & [string, string];
    return [["startsWith", scopeName, config]];
  } else {
    return [["is", name, config]];
  }
}

const FIRST_CHAR = 0;
const LAST_CHAR = -1;

function removeLast(string: string): string {
  return string.slice(FIRST_CHAR, LAST_CHAR);
}
