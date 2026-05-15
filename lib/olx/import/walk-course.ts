"use client";

import { attr, getXml, type TarEntry } from "./tar";
import { parseBlockFile } from "./parse-block";

export function walkChapters(
  courseEl: Element,
  files: Map<string, TarEntry>,
  warnings: string[],
): unknown[] {
  const chapterUrlNames = Array.from(courseEl.querySelectorAll(":scope > chapter")).map(
    (el) => attr(el, "url_name"),
  );

  return chapterUrlNames.flatMap((chUrlName) => {
    const chEl = getXml(files, `chapter/${chUrlName}.xml`);
    if (!chEl) {
      warnings.push(`ข้าม chapter url_name="${chUrlName}": ไม่พบไฟล์`);
      return [];
    }
    const chName = attr(chEl, "display_name") || attr(chEl, "displayName") || chUrlName;
    const sequentials = walkSequentials(chEl, files, warnings);
    if (sequentials.length === 0) {
      warnings.push(`ข้าม chapter "${chName}": ไม่มี sequential ที่ถูกต้อง`);
      return [];
    }
    return [{ displayName: chName, sequentials }];
  });
}

function walkSequentials(chEl: Element, files: Map<string, TarEntry>, warnings: string[]): unknown[] {
  const seqUrlNames = Array.from(chEl.querySelectorAll(":scope > sequential")).map(
    (el) => attr(el, "url_name"),
  );

  return seqUrlNames.flatMap((seqUrlName) => {
    const seqEl = getXml(files, `sequential/${seqUrlName}.xml`);
    if (!seqEl) {
      warnings.push(`ข้าม sequential url_name="${seqUrlName}": ไม่พบไฟล์`);
      return [];
    }
    const seqName = attr(seqEl, "display_name") || attr(seqEl, "displayName") || seqUrlName;
    const format = attr(seqEl, "format") || undefined;
    const seqStart = attr(seqEl, "start") || undefined;
    const dueRaw = attr(seqEl, "due");
    const seqDue = dueRaw && dueRaw !== "null" ? dueRaw : undefined;
    const showCorrectness = (attr(seqEl, "show_correctness") as "always" | "never" | "past_due") || undefined;

    const verticals = walkVerticals(seqEl, files, warnings);
    if (verticals.length === 0) {
      warnings.push(`ข้าม sequential "${seqName}": ไม่มี vertical ที่ถูกต้อง`);
      return [];
    }
    return [{
      displayName: seqName,
      ...(format ? { format } : {}),
      ...(seqStart ? { start: seqStart } : {}),
      ...(seqDue ? { due: seqDue } : {}),
      ...(showCorrectness ? { showCorrectness } : {}),
      verticals,
    }];
  });
}

function walkVerticals(seqEl: Element, files: Map<string, TarEntry>, warnings: string[]): unknown[] {
  const vertUrlNames = Array.from(seqEl.querySelectorAll(":scope > vertical")).map(
    (el) => attr(el, "url_name"),
  );

  return vertUrlNames.flatMap((vertUrlName) => {
    const vertEl = getXml(files, `vertical/${vertUrlName}.xml`);
    if (!vertEl) {
      warnings.push(`ข้าม vertical url_name="${vertUrlName}": ไม่พบไฟล์`);
      return [];
    }
    const vertName = attr(vertEl, "display_name") || attr(vertEl, "displayName") || vertUrlName;

    const blocks = Array.from(vertEl.children).flatMap((child) => {
      const tag = child.tagName;
      const urlName = attr(child, "url_name");
      // Some blocks (poll, openassessment) may be fully inlined with no url_name
      const block = parseBlockFile(tag, urlName, files, warnings, child);
      return block ? [block] : [];
    });

    if (blocks.length === 0) {
      warnings.push(`ข้าม vertical "${vertName}": ไม่มี block ที่ถูกต้อง`);
      return [];
    }
    return [{ displayName: vertName, blocks }];
  });
}
