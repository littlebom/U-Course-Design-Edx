import { create } from "xmlbuilder2";
import type { LtiBlock } from "../schema";

export function buildLtiBlock(block: LtiBlock, id: string): string {
  const attrs: Record<string, string> = {
    url_name: id,
    display_name: block.displayName,
    lti_version: block.ltiVersion,
    lti_1p3_launch_url: block.launchUrl,
    has_score: block.hasScore ? "true" : "false",
    weight: String(block.weight),
    launch_target: block.launchTarget,
    xblock_family: "xblock.v1",
    enable_processors: "true",
  };
  if (block.oidcUrl) attrs.lti_1p3_oidc_url = block.oidcUrl;
  if (block.keysetUrl) {
    attrs.lti_1p3_tool_key_mode = "keyset_url";
    attrs.lti_1p3_tool_keyset_url = block.keysetUrl;
  }
  if (block.buttonText) attrs.button_text = block.buttonText;
  return create({ version: "1.0" })
    .ele("lti_consumer", attrs)
    .end({ prettyPrint: true, headless: true });
}
