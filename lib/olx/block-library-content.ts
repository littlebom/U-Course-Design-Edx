import type { LibraryContentBlock } from "../schema";

// library_content export: write rawXml verbatim to its own file
export function buildLibraryContentBlockFile(block: LibraryContentBlock, id: string): string {
  const xml = block.rawXml.trimStart();
  return xml.replace(/url_name="[^"]*"/, `url_name="${id}"`) + "\n";
}
