import { create } from "xmlbuilder2";
import type { VideoBlock } from "../schema";

export function buildVideoBlock(block: VideoBlock, id: string): string {
  const transcriptsMap: Record<string, string> = {};
  for (const t of block.transcripts) {
    transcriptsMap[t.lang] = t.srtFile;
  }

  const html5Sources = block.mp4Url ? [block.mp4Url] : [];

  const attrs: Record<string, string> = {
    url_name: id,
    display_name: block.displayName,
    download_video: block.downloadAllowed ? "true" : "false",
    html5_sources: JSON.stringify(html5Sources),
    sub: block.transcripts.find((t) => t.lang === "en")?.srtFile ?? "",
    transcripts: JSON.stringify(transcriptsMap),
  };

  if (block.youtubeId) {
    attrs.youtube = `1.00:${block.youtubeId}`;
    attrs.youtube_id_1_0 = block.youtubeId;
  }
  if (block.edxVideoId) attrs.edx_video_id = block.edxVideoId;

  const root = create({ version: "1.0" }).ele("video", attrs);

  if (block.mp4Url) root.ele("source", { src: block.mp4Url });

  const vaNode = root
    .ele("video_asset", { client_video_id: "external video", duration: "0.0", image: "" })
    .ele("transcripts");
  for (const t of block.transcripts) {
    vaNode.ele("transcript", { language_code: t.lang, file_format: "srt", provider: "Custom" });
  }

  for (const t of block.transcripts) {
    root.ele("transcript", { language: t.lang, src: t.srtFile });
  }

  return root.end({ prettyPrint: true, headless: true });
}

// Returns filenames in static/ that this video depends on (SRT files)
export function videoStaticRefs(block: VideoBlock): string[] {
  return block.transcripts.map((t) => t.srtFile).filter(Boolean);
}
