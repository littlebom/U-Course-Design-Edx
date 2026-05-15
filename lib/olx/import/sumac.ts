"use client";

import { urlName as makeUrlName } from "../ids";
import { escapeRegex, type TarEntry } from "./tar";

// Sumac ใช้ SHA1 20-char hex; Ulmo ใช้ UUID 32-char hex — ทั้งคู่ valid
export const VALID_ID = /^[0-9a-f]{20,32}$/i;
// Generic names เช่น problem1, problem2, vertical3 ที่เกิดจาก copy/paste ใน Sumac
export const GENERIC_NAME = /^(problem|vertical|html|video|discussion)\d+$/i;

// Block directories ที่ url_name มีความสำคัญต่อ reference
const BLOCK_DIRS = [
  "chapter", "sequential", "vertical", "html", "problem",
  "video", "discussion", "lti_consumer", "poll", "openassessment", "library_content",
];

export interface SumacIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

// Auto-clean Sumac artifacts ก่อน parse:
// 1. Rename generic-named block files (html1, problem3) → UUID + update references
// 2. Strip Sumac-specific attributes (upstream="null", x-is-pointer-node, copied_from_block)
// 3. Remove library_content ที่อ้าง library-v1 (deprecated ใน Ulmo)
export function cleanSumacFiles(files: Map<string, TarEntry>, warnings: string[]): void {
  // Step 1: หา generic-named block files และสร้าง rename map
  const renameMap = new Map<string, string>();
  const pathRe = /^(?:course\/)?([a-z_]+)\/([^/]+)\.xml$/;
  for (const path of files.keys()) {
    const m = path.match(pathRe);
    if (!m) continue;
    const [, dir, blockName] = m;
    if (!BLOCK_DIRS.includes(dir)) continue;
    if (GENERIC_NAME.test(blockName) && !renameMap.has(blockName)) {
      renameMap.set(blockName, makeUrlName());
    }
  }
  const renamed = renameMap.size;

  // Step 2: rewrite XML text — replace url_name/filename references + strip Sumac attributes
  let strippedCount = 0;
  for (const entry of files.values()) {
    if (!entry.text) continue;
    let newText = entry.text;

    for (const [oldName, newName] of renameMap) {
      const re = new RegExp(`(url_name|filename)="${escapeRegex(oldName)}"`, "g");
      newText = newText.replace(re, `$1="${newName}"`);
    }

    const before = newText;
    newText = newText
      .replace(/\s+upstream="null"/g, "")
      .replace(/\s+x-is-pointer-node="[^"]*"/g, "")
      .replace(/\s+copied_from_block="[^"]*"/g, "");
    if (newText !== before) strippedCount++;

    if (newText !== entry.text) entry.text = newText;
  }

  // Step 3: rename file paths in Map (.xml และ .html ของ html block)
  if (renameMap.size > 0) {
    const renamePathRe = /^((?:course\/)?[a-z_]+\/)([^/]+)(\.[^/]+)$/;
    const moves: Array<[string, string]> = [];
    for (const path of files.keys()) {
      const m = path.match(renamePathRe);
      if (!m) continue;
      const newName = renameMap.get(m[2]);
      if (!newName) continue;
      moves.push([path, `${m[1]}${newName}${m[3]}`]);
    }
    for (const [oldPath, newPath] of moves) {
      const entry = files.get(oldPath)!;
      files.delete(oldPath);
      files.set(newPath, entry);
    }
  }

  if (renamed > 0) warnings.push(`🧹 Auto-clean: เปลี่ยนชื่อ generic block ${renamed} รายการ → UUID`);
  if (strippedCount > 0) warnings.push(`🧹 Auto-clean: ลบ Sumac-specific attributes จาก ${strippedCount} ไฟล์`);

  // Step 4: ลบ library_content ที่อ้าง library-v1 (deprecated ใน Ulmo)
  const v1LibraryIds = new Set<string>();
  for (const [path, entry] of files) {
    const m = path.match(/^(?:course\/)?library_content\/([^/]+)\.xml$/);
    if (!m) continue;
    if (entry.text.includes('source_library_id="library-v1:')) {
      v1LibraryIds.add(m[1]);
      files.delete(path);
    }
  }
  if (v1LibraryIds.size > 0) {
    for (const entry of files.values()) {
      if (!entry.text || !entry.text.includes("library_content")) continue;
      let newText = entry.text;
      for (const id of v1LibraryIds) {
        const re = new RegExp(`\\s*<library_content[^>]*url_name="${escapeRegex(id)}"[^>]*/>\\s*`, "g");
        newText = newText.replace(re, "\n");
      }
      if (newText !== entry.text) entry.text = newText;
    }
    warnings.push(`🧹 Auto-clean: ลบ library_content ที่อ้าง library-v1 (deprecated) ${v1LibraryIds.size} รายการ`);
  }
}

// ตรวจสอบ patterns ที่ทำให้เกิด orphan blocks เมื่อ import เข้า Ulmo
// อ้างอิง: FlexspacePro Error-Analysis-Report.md
export function validateSumacCompatibility(files: Map<string, TarEntry>): SumacIssue[] {
  const issues: SumacIssue[] = [];

  for (const [path, entry] of files) {
    if (!path.endsWith(".xml")) continue;
    const parts = path.split("/");
    if (parts.length < 2) continue;
    const [dir, filename] = [parts[0], parts[parts.length - 1]];
    const blockName = filename.replace(/\.xml$/, "");
    const isBlockDir = ["problem", "vertical", "html", "video", "discussion", "lti_consumer"].includes(dir);
    if (!isBlockDir) continue;

    if (GENERIC_NAME.test(blockName)) {
      issues.push({
        level: "error",
        file: path,
        message: `Generic block name "${blockName}" — เกิดจาก copy/paste ใน Sumac จะสร้าง orphan ใน Ulmo`,
      });
      continue;
    }

    if (!VALID_ID.test(blockName)) {
      issues.push({
        level: "warning",
        file: path,
        message: `Block name "${blockName}" ไม่ใช่ ID มาตรฐาน — อาจเกิดปัญหาใน Ulmo`,
      });
    }

    const text = entry.text;
    if (text.includes('upstream="null"')) {
      issues.push({ level: "warning", file: path, message: `พบ upstream="null" (Sumac Library v2 attribute) — ไม่ compatible กับ Ulmo` });
    }
    if (text.includes("x-is-pointer-node")) {
      issues.push({ level: "warning", file: path, message: `พบ x-is-pointer-node (Sumac Library v2 feature) — จะถูกละเว้นใน Ulmo` });
    }
    if (text.includes("copied_from_block")) {
      issues.push({ level: "warning", file: path, message: `พบ copied_from_block (Sumac Library v2) — Library ต้นฉบับต้องถูก import มาด้วย` });
    }
    if (text.includes("<library_content") || text.includes("library-v1:")) {
      issues.push({ level: "error", file: path, message: `พบ Library v1 reference — Deprecated ใน Ulmo และ Library ต้นฉบับต้องถูก import มาด้วย` });
    }
  }

  return issues;
}

export function formatSumacIssues(issues: SumacIssue[]): string[] {
  if (issues.length === 0) return [];
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warnCount = issues.filter((i) => i.level === "warning").length;
  const lines: string[] = [
    `⚠️ ตรวจพบ ${errorCount} ปัญหาร้ายแรง และ ${warnCount} คำเตือนที่เกี่ยวกับ Sumac→Ulmo compatibility:`,
  ];
  for (const issue of issues) {
    const icon = issue.level === "error" ? "🔴" : "🟡";
    lines.push(`${icon} [${issue.file}] ${issue.message}`);
  }
  if (issues.some((i) => i.message.includes("Generic block name"))) {
    lines.push(`💡 แนะนำ: ลบ Unit ที่มี generic block ใน Sumac Studio แล้ว Publish → Export ใหม่ก่อน Import`);
  }
  if (issues.some((i) => i.message.includes("Library v1"))) {
    lines.push(`💡 แนะนำ: Library v1 ถูก deprecated ใน Ulmo — แปลงเป็น Library v2 ใน Sumac Studio หรือ import Library ต้นฉบับมาด้วย`);
  }
  return lines;
}
