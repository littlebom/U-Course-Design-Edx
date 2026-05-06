import { Readable } from "node:stream";
import { createGzip } from "node:zlib";
import tar from "tar-stream";

export type FileEntry = { path: string; data: string | Buffer };

export function packTarGz(files: FileEntry[]): Readable {
  const pack = tar.pack();
  (async () => {
    for (const f of files) {
      const buf = typeof f.data === "string" ? Buffer.from(f.data, "utf8") : f.data;
      await new Promise<void>((resolve, reject) =>
        pack.entry({ name: f.path, size: buf.length }, buf, (err) =>
          err ? reject(err) : resolve(),
        ),
      );
    }
    pack.finalize();
  })().catch((e) => pack.destroy(e));
  return pack.pipe(createGzip());
}
