import type { PackageJSON, StarbeamKey, StarbeamValue } from "#/manifest";

import type { JsonValue } from "./types";

export function getPackageMeta<P extends StarbeamKey, T>(
  root: string,
  json: PackageJSON,
  path: P,
  map: (value: StarbeamValue<P>) => T,
): T;
export function getPackageMeta<P extends StarbeamKey>(
  root: string,
  json: PackageJSON,
  path: P,
): StarbeamValue<P>;
export function getPackageMeta(
  root: string,
  packageJSON: PackageJSON,
  path: StarbeamKey,
  map: (value: unknown) => unknown = (value) => value,
): unknown {
  const inline = packageJSON[`starbeam:${path}`];

  if (inline) {
    return map(inline);
  }

  const starbeam = packageJSON.starbeam;

  if (!starbeam) {
    return map(undefined);
  }

  if (typeof starbeam === "object") {
    const value = starbeam[path];
    return map(value);
  }

  invalidKey(root, starbeam);
}

/**
 * @param {string} root
 * @param {import("#/json").JsonValue} value
 */
function invalidKey(root: string, value: JsonValue) {
  const message = [`Invalid value for the starbeam key (expected an object`];

  if (Array.isArray(value)) {
    message.push(`, got an array`);
  } else {
    message.push(`, got ${JSON.stringify(value)}`);
  }

  message.push(`) at ${root}`);

  throw Error(message.join(""));
}
