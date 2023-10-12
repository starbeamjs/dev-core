export function parseJSON<T>(string: string): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(string);
}
