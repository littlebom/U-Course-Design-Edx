import { Video } from "lucide-react";
import { VideoFields } from "@/components/blocks/VideoFields";
import type { VideoBlock } from "@/lib/schema";
import type { BlockModule } from "../types";

export const videoModule: BlockModule<"video"> = {
  type: "video",
  meta: {
    icon: Video,
    iconBg: "bg-destructive",
    badgeColor: "destructive",
    title: "Video",
  },
  badgeLabel: () => "YouTube / MP4",
  Editor: VideoFields,
  empty: (overrides) => ({
    type: "video",
    displayName: "Video ใหม่",
    youtubeId: "",
    mp4Url: "",
    downloadAllowed: false,
    transcripts: [],
    edxVideoId: "",
    ...overrides,
  }) as VideoBlock,
};
