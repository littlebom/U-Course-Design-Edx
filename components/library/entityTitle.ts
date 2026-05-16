import type { LibraryEntity } from "@/lib/library/schema";

export function entityTitle(e: LibraryEntity): string {
  return e.title || e.key;
}
