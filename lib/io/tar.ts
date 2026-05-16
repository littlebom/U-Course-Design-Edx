import pako from "pako";

export interface TarEntry {
  text: string;
  binary: Uint8Array;
}

// Decompress + parse a .tar.gz into a flat path → entry map. The top-level
// directory wrapper (e.g. "course/" or "library/") is stripped so paths read
// like "library.xml" or "problem/<id>.xml" regardless of who archived it.
export function untarGz(buffer: ArrayBuffer): Map<string, TarEntry> {
  const files = new Map<string, TarEntry>();
  const decompressed = pako.ungzip(new Uint8Array(buffer));
  const dec = new TextDecoder();

  let offset = 0;
  while (offset + 512 <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const name = dec.decode(header.subarray(0, 100)).replace(/\0/g, "").trim();
    const sizeOctal = dec.decode(header.subarray(124, 136)).replace(/\0/g, "").trim();
    const typeflag = dec.decode(header.subarray(156, 157)).replace(/\0/g, "").trim();

    const size = parseInt(sizeOctal, 8) || 0;
    offset += 512;

    if (typeflag === "" || typeflag === "0") {
      const binary = decompressed.slice(offset, offset + size);
      const text = dec.decode(binary);
      const normalized = name.replace(/^\.\//, "").replace(/^\S+?\//, "");
      files.set(normalized, { text, binary });
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}
