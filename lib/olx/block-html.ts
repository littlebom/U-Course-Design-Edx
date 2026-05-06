import { create } from "xmlbuilder2";
import type { HtmlBlock } from "../schema";
import { rewriteAssets } from "./asset-rewrite";

export function buildHtmlBlock(block: HtmlBlock, id: string): {
  pointerXml: string;
  htmlContent: string;
  assetRefs: Set<string>;
} {
  const { html, refs } = rewriteAssets(block.html);
  const pointerXml = create({ version: "1.0" })
    .ele("html", { filename: id, display_name: block.displayName })
    .end({ prettyPrint: false, headless: true });
  return { pointerXml, htmlContent: html, assetRefs: refs };
}
