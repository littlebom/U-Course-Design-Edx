import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

// Thin facade over fflate so the rest of the app doesn't import it directly.
// Keeps swap-out (different lib, Web Worker, streaming variant) a one-file job.

export function unzip(buffer: ArrayBuffer): Record<string, Uint8Array> {
  return unzipSync(new Uint8Array(buffer));
}

export type ZipLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function zip(files: Record<string, Uint8Array>, level: ZipLevel = 6): Uint8Array {
  return zipSync(files, { level });
}

// Read a zip entry as a UTF-8 string.
export function readText(files: Record<string, Uint8Array>, path: string): string | undefined {
  const buf = files[path];
  return buf ? strFromU8(buf) : undefined;
}

// Encode a UTF-8 string as Uint8Array for inclusion in a zip.
export function writeText(text: string): Uint8Array {
  return strToU8(text);
}
