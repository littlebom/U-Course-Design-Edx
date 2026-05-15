import type { UnknownBlock } from "../schema";

export function buildUnknownBlockFile(block: UnknownBlock, id: string): string {
  return block.rawXml.trimStart().replace(/url_name="[^"]*"/, `url_name="${id}"`) + "\n";
}
