import type { OraBlock } from "../schema";

// ORA export: write rawXml verbatim to its own file (pointer style)
// The vertical references it with <openassessment url_name="xxx"/>
export function buildOraBlockFile(block: OraBlock, id: string): string {
  // rawXml already contains the full <openassessment .../> element.
  // We strip the outer tag and write just the inner content wrapped in the tag
  // with the canonical url_name so edX can look it up.
  // Simplest: return rawXml as-is (it already has url_name from import).
  // But we override url_name to the new id to keep consistency.
  const xml = block.rawXml.trimStart();
  // Replace url_name="..." with the new id
  return xml.replace(/url_name="[^"]*"/, `url_name="${id}"`) + "\n";
}
