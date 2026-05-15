import {
  FileText, HelpCircle, Video, MessageSquare, Link2, BarChart2,
  BookOpenCheck, Library, Code2,
  type LucideIcon,
} from "lucide-react";
import type { Block, LibraryContentBlock, ProblemBlock, UnknownBlock } from "./schema";

// Single source of truth for per-block-type presentation: icon, color, label.
// Used by both BlockEditor (header) and CourseOutline (tree row).

export type BadgeColor =
  | "default" | "secondary" | "destructive" | "success" | "warning" | "info";

export interface BlockMeta {
  icon: LucideIcon;
  // Background color class for the icon chip (avatar style)
  iconBg: string;
  // Badge color in design system
  badgeColor: BadgeColor;
  // Title shown in the editor header
  title: string;
  // Short label shown in the badge
  badgeLabel: string;
}

// Static portion of the meta — depends only on block.type
const STATIC_META: Record<Block["type"], Omit<BlockMeta, "title" | "badgeLabel">> = {
  html:             { icon: FileText,       iconBg: "bg-default-600", badgeColor: "secondary"   },
  video:            { icon: Video,          iconBg: "bg-destructive", badgeColor: "destructive" },
  discussion:       { icon: MessageSquare,  iconBg: "bg-success",     badgeColor: "success"     },
  lti:              { icon: Link2,          iconBg: "bg-info",        badgeColor: "default"     },
  poll:             { icon: BarChart2,      iconBg: "bg-purple-500",  badgeColor: "secondary"   },
  ora:              { icon: BookOpenCheck,  iconBg: "bg-rose-600",    badgeColor: "secondary"   },
  library_content:  { icon: Library,        iconBg: "bg-teal-600",    badgeColor: "secondary"   },
  unknown:          { icon: Code2,          iconBg: "bg-slate-500",   badgeColor: "secondary"   },
  problem:          { icon: HelpCircle,     iconBg: "bg-warning",     badgeColor: "warning"     },
};

const STATIC_TITLES: Record<Block["type"], string> = {
  html: "HTML Block",
  video: "Video",
  discussion: "Discussion",
  lti: "LTI Block",
  poll: "Poll",
  ora: "Open Response Assessment",
  library_content: "Library Content",
  unknown: "Unknown Block",
  problem: "Problem",
};

export function getBlockMeta(block: Block): BlockMeta {
  const meta = STATIC_META[block.type];
  let title = STATIC_TITLES[block.type];
  let badgeLabel: string;

  switch (block.type) {
    case "html":            badgeLabel = "เนื้อหา HTML"; break;
    case "video":           badgeLabel = "YouTube / MP4"; break;
    case "discussion":      badgeLabel = "กระดานสนทนา"; break;
    case "lti":             badgeLabel = "LTI 1.3"; break;
    case "poll":            badgeLabel = "สำรวจความคิดเห็น"; break;
    case "ora":             badgeLabel = "Pass-through"; break;
    case "unknown":         badgeLabel = "Pass-through";
                            title = `Unknown Block (${(block as UnknownBlock).blockType})`;
                            break;
    case "library_content": badgeLabel = `สุ่ม ${(block as LibraryContentBlock).maxCount} ข้อ`; break;
    case "problem":
      badgeLabel = (block as ProblemBlock).problemType === "multiplechoice"
        ? "เลือก 1 ข้อ"
        : "เลือกหลายข้อ";
      break;
  }

  return { ...meta, title, badgeLabel };
}

// Lightweight variant — only static visuals, given just the type. Useful for
// outline rows where we don't need title / badge.
export function getBlockVisuals(type: Block["type"]): { icon: LucideIcon; iconBg: string } {
  const meta = STATIC_META[type];
  return { icon: meta.icon, iconBg: meta.iconBg };
}
