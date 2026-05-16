import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "fixtures");

export function loadFixtureBuffer(name: string): ArrayBuffer {
  const bytes = readFileSync(path.join(ROOT, name));
  // Return a fresh ArrayBuffer (not the underlying Node Buffer pool view)
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  return ab;
}
