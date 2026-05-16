"use client";

import type { Block, Course } from "@/lib/schema";
import type { AssetFile } from "./AssetUploader";
import { BlockHeader } from "./blocks/BlockHeader";
import { HtmlField } from "./blocks/HtmlField";
import { getBlockModule } from "@/lib/blocks/registry";

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

      {/* HTML needs the asset context — handled specially. Everything else
          flows through the block registry's Editor component. */}
      {block.type === "html" ? (
        <HtmlField
          html={block.html}
          onChange={(v) => update((b) => ((b as Extract<Block, { type: "html" }>).html = v))}
          assets={assets}
          onAddAsset={onAddAsset}
        />
      ) : (() => {
        const Editor = getBlockModule(block.type).Editor;
        return <Editor block={block} update={update} />;
      })()}
    </div>
  );
}
