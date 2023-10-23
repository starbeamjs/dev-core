import type { PackageJSON, StarbeamKey, StarbeamValue } from "./manifest.js";
import type { JsonValue } from "./types.js";

export class GetPackageMeta {
  readonly #root: string;
  readonly #json: PackageJSON;

  constructor(root: string, json: PackageJSON) {
    this.#root = root;
    this.#json = json;
  }

  get<P extends StarbeamKey>(path: P): StarbeamValue<P> {
    return getPackageMeta(this.#root, this.#json, path);
  }

  map<P extends StarbeamKey, T>(
    path: P,
    map: (value: StarbeamValue<P>) => T,
  ): T {
    return getPackageMeta(this.#root, this.#json, path, map);
  }
}

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

function invalidKey(root: string, value: JsonValue): void {
  const message = [`Invalid value for the starbeam key (expected an object`];

  if (Array.isArray(value)) {
    message.push(`, got an array`);
  } else {
    message.push(`, got ${JSON.stringify(value)}`);
  }

  message.push(`) at ${root}`);

  throw Error(message.join(""));
}
