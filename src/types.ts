export type RollupExternal = boolean;

export interface StarbeamInfo {
  readonly inline: NormalizedExternalOption[];
  readonly strict: StrictSettings;
  readonly source: string | undefined;
  readonly jsx: string | undefined;
  readonly type: string;
  readonly entry: Record<string, string>;
}

export interface PackageInfo {
  readonly name: string;
  readonly root: string;
  readonly main: string;
  readonly starbeam: StarbeamInfo;
  readonly dependencies: Record<string, string>;
}

export type Strictness = "error" | "warn" | "allow";

export interface StrictSettings {
  /**
   * The "strict.externals" setting requires that externals included in the
   * built package be explicitly included as part of a "starbeam:inline" policy
   * (or the default policy).
   */
  readonly externals: Strictness;
}

export type ExternalConfig = "inline" | "external";
export type SimpleExternal = Record<string, ExternalConfig>;
export type SpecifiedExternal = SimpleExternal | string[];

export type RuleRecord = Record<string, ExternalConfig>;
export type InlineRule = string | RuleRecord;
export type InlineRules = RuleRecord | InlineRule[];

export type NormalizedExternalOption = [
  NormalizedExternalOperator,
  string,
  ExternalConfig,
];

export type NormalizedExternalOperator = "startsWith" | "is";
export type JsonArray = JsonValue[];
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;
