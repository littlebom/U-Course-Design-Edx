"use client";

import type { Block, Course } from "@/lib/schema";
import type { AssetFile } from "./AssetUploader";
import { BlockHeader } from "./blocks/BlockHeader";
import { HtmlField } from "./blocks/HtmlField";
import { VideoFields } from "./blocks/VideoFields";
import { ProblemFields } from "./blocks/ProblemFields";
import { LtiFields } from "./blocks/LtiFields";
import { DiscussionFields } from "./blocks/DiscussionFields";
import { PollFields } from "./blocks/PollFields";
import { OraView } from "./blocks/OraView";
import { LibraryContentView } from "./blocks/LibraryContentView";
import { UnknownView } from "./blocks/UnknownView";

type Props = {
  course: Course;
  path: { ci: number; si: number; vi: number; bi: number };
  onChange: (next: Course) => void;
  assets: Map<string, AssetFile>;
  onAddAsset: (file: File, suggestedName?: string) => string;
};

export function BlockEditor({ course, path, onChange, assets, onAddAsset }: Props) {
  const block = course.chapters[path.ci]?.sequentials[path.si]?.verticals[path.vi]?.blocks[path.bi];
  if (!block) return <div className="text-sm text-muted-foreground">เลือก block จากโครงสร้าง</div>;

  const update = (mut: (b: Block) => void) => {
    const next = structuredClone(course);
    const b = next.chapters[path.ci].sequentials[path.si].verticals[path.vi].blocks[path.bi];
    mut(b);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <BlockHeader
        block={block}
        onRename={(v) => update((b) => (b.displayName = v))}
      />

      {renderFields(block, update, assets, onAddAsset)}
    </div>
  );
}

function renderFields(
  block: Block,
  update: (mut: (b: Block) => void) => void,
  assets: Map<string, AssetFile>,
  onAddAsset: (file: File, suggestedName?: string) => string,
) {
  switch (block.type) {
    case "html":
      return (
        <HtmlField
          html={block.html}
          onChange={(v) => update((b) => ((b as Extract<Block, { type: "html" }>).html = v))}
          assets={assets}
          onAddAsset={onAddAsset}
        />
      );
    case "video":            return <VideoFields block={block} update={update} />;
    case "problem":          return <ProblemFields block={block} update={update} />;
    case "discussion":       return <DiscussionFields block={block} update={update} />;
    case "lti":              return <LtiFields block={block} update={update} />;
    case "poll":             return <PollFields block={block} update={update} />;
    case "ora":              return <OraView block={block} />;
    case "library_content":  return <LibraryContentView block={block} />;
    case "unknown":          return <UnknownView block={block} />;
  }
}
