import { create } from "xmlbuilder2";
import type { VideoBlock } from "../schema";

export function buildVideoBlock(block: VideoBlock, id: string): string {
  const root = create({ version: "1.0" }).ele("video", {
    url_name: id,
    display_name: block.displayName,
    youtube: `1.00:${block.youtubeId}`,
    youtube_id_1_0: block.youtubeId,
    download_video: block.downloadAllowed ? "true" : "false",
    html5_sources: "[]",
    sub: "",
    transcripts: "{}",
  });
  root
    .ele("video_asset", { client_video_id: "external video", duration: "0.0", image: "" })
    .ele("transcripts");
  return root.end({ prettyPrint: true, headless: true });
}
