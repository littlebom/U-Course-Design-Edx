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

// Build a gzip-compressed tar (.tar.gz) from a path → bytes map, using minimal
// POSIX ustar headers. Paths are stored verbatim (include any wrapper dir the
// caller wants, e.g. "library/library.xml"). Filenames must encode to ≤100
// UTF-8 bytes — longer names throw so callers can skip + warn rather than emit
// a corrupt archive. mtime is fixed at 0 for deterministic output.
export function tarGz(files: Record<string, Uint8Array>): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];

  for (const [path, data] of Object.entries(files)) {
    const nameBytes = enc.encode(path);
    if (nameBytes.length > 100) {
      throw new Error(`tar: ชื่อไฟล์ยาวเกิน 100 bytes (${nameBytes.length}): ${path}`);
    }
    const header = new Uint8Array(512);
    header.set(nameBytes, 0);

    const octal = (val: number, off: number, len: number) => {
      // len-1 octal digits + trailing NUL (e.g. mode "0000644\0")
      header.set(enc.encode(val.toString(8).padStart(len - 1, "0") + "\0"), off);
    };
    octal(0o644, 100, 8);        // mode
    octal(0, 108, 8);            // uid
    octal(0, 116, 8);            // gid
    octal(data.length, 124, 12); // size
    octal(0, 136, 12);           // mtime (deterministic)
    header[156] = 0x30;          // typeflag '0' = regular file
    header.set(enc.encode("ustar\0"), 257); // magic
    header.set(enc.encode("00"), 263);       // version

    // Checksum: sum all header bytes with the checksum field treated as spaces.
    for (let i = 148; i < 156; i++) header[i] = 0x20;
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.set(enc.encode(sum.toString(8).padStart(6, "0") + "\0 "), 148);

    chunks.push(header, data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) chunks.push(new Uint8Array(pad));
  }
  chunks.push(new Uint8Array(1024)); // two zero blocks = end of archive

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const tar = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    tar.set(c, off);
    off += c.length;
  }
  return pako.gzip(tar);
}
