"use client";

import pako from "pako";
import { type Course } from "./schema";
import { type ParseXmlResult } from "./xmlParse";
import { urlName as makeUrlName } from "./olx/ids";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Block directories ที่ url_name มีความสำคัญต่อ reference
const BLOCK_DIRS = ["chapter", "sequential", "vertical", "html", "problem", "video", "discussion", "lti_consumer", "poll", "openassessment", "library_content"];

// Clean Sumac-specific artifacts ใน .tar.gz ก่อน parse:
// 1. Rename generic-named block files (html1, problem3, vertical8) → UUID + update reference ทั้งหมด
// 2. Strip Sumac-specific attributes ที่ Ulmo ไม่รับ (upstream="null", x-is-pointer-node, copied_from_block)
function cleanSumacFiles(files: Map<string, { text: string; binary: Uint8Array }>, warnings: string[]): void {
  // Step 1: หา generic-named block files และสร้าง rename map
  const renameMap = new Map<string, string>(); // oldName → newName
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

    // Update url_name="oldName" และ filename="oldName" (สำหรับ html pointer)
    for (const [oldName, newName] of renameMap) {
      const re = new RegExp(`(url_name|filename)="${escapeRegex(oldName)}"`, "g");
      newText = newText.replace(re, `$1="${newName}"`);
    }

    // Strip Sumac-specific attributes
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

  if (renamed > 0) {
    warnings.push(`🧹 Auto-clean: เปลี่ยนชื่อ generic block ${renamed} รายการ → UUID`);
  }
  if (strippedCount > 0) {
    warnings.push(`🧹 Auto-clean: ลบ Sumac-specific attributes จาก ${strippedCount} ไฟล์`);
  }

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
    // ลบ <library_content url_name="..."/> ออกจาก vertical XML ทั้งหมด
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

type TarEntry = { text: string; binary: Uint8Array };

// Extract files from a .tar.gz into a Map<path, TarEntry>
async function extractTar(buffer: ArrayBuffer): Promise<Map<string, TarEntry>> {
  const files = new Map<string, TarEntry>();
  const decompressed = pako.ungzip(new Uint8Array(buffer));

  let offset = 0;
  const dec = new TextDecoder();

  while (offset + 512 <= decompressed.length) {
    const header = decompressed.subarray(offset, offset + 512);

    // Check for end-of-archive (two zero blocks)
    if (header.every((b) => b === 0)) break;

    const name = dec.decode(header.subarray(0, 100)).replace(/\0/g, "").trim();
    const sizeOctal = dec.decode(header.subarray(124, 136)).replace(/\0/g, "").trim();
    const typeflag = dec.decode(header.subarray(156, 157)).replace(/\0/g, "").trim();

    const size = parseInt(sizeOctal, 8) || 0;
    offset += 512;

    if (typeflag === "" || typeflag === "0") {
      const binary = decompressed.slice(offset, offset + size);
      const text = dec.decode(binary);
      // Normalize path: remove leading "./" or "course.xxx/"
      const normalized = name.replace(/^\.\//, "").replace(/^\S+?\//, "");
      files.set(normalized, { text, binary });
    }

    // Advance past file data (rounded up to 512-byte blocks)
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

function getXml(files: Map<string, TarEntry>, path: string): Element | null {
  const entry = files.get(path);
  if (!entry) return null;
  const doc = new DOMParser().parseFromString(entry.text, "application/xml");
  const err = doc.querySelector("parseerror, parsererror");
  if (err) return null;
  return doc.documentElement;
}

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

// Parse a <problem> OLX file. Supports MCQ, checkbox, and dropdown (optionresponse).
function parseProblemFile(
  el: Element,
  displayName: string,
  warnings: string[],
): object | null {
  const isCheckbox = !!el.querySelector("checkboxgroup");
  const isDropdown = !!el.querySelector("optionresponse");

  let choices: { text: string; correct: boolean }[] = [];

  if (isDropdown) {
    // Dropdown: <optioninput><option correct="True">…</option>…</optioninput>
    // Multi-part problems have multiple <optionresponse> blocks — use the first one only
    const firstOptInput = el.querySelector("optioninput");
    const optionEls = firstOptInput?.querySelectorAll("option") ?? [];
    choices = Array.from(optionEls).map((o) => ({
      text: o.textContent?.trim() ?? "",
      correct: o.getAttribute("correct")?.toLowerCase() === "true",
    }));
  } else {
    const choiceEls = el.querySelectorAll(
      "choicegroup > choice, checkboxgroup > choice",
    );
    choices = Array.from(choiceEls).map((c) => {
      const correct = c.getAttribute("correct") === "true";
      const divEl = c.querySelector("div, p");
      const text = (divEl?.textContent ?? c.textContent ?? "").trim();
      return { text, correct };
    });
  }

  if (choices.length < 2) {
    warnings.push(
      `Problem "${displayName}": พบตัวเลือก ${choices.length} ข้อ — เติม placeholder อัตโนมัติ`,
    );
    while (choices.length < 2) {
      choices.push({ text: `ตัวเลือก ${choices.length + 1} (placeholder)`, correct: choices.length === 0 });
    }
  }

  // Ensure at least one correct answer (dropdown may have correct="" if not matched)
  if (!choices.some((c) => c.correct)) choices[0].correct = true;

  // Question text
  const qEl =
    el.querySelector("label") ??
    el.querySelector("p") ??
    el.querySelector("legend");
  const question = qEl ? `<p>${qEl.textContent?.trim()}</p>` : `<p>${displayName}</p>`;

  // Solution / explanation
  const solutionEl = el.querySelector("solution div, solution p");
  const explanation = solutionEl?.textContent?.trim() || undefined;

  const maxAttemptsRaw = el.getAttribute("max_attempts");
  const showAnswerRaw = el.getAttribute("showanswer");

  return {
    type: "problem" as const,
    displayName,
    // Dropdown is treated as multiplechoice (single correct)
    problemType: isCheckbox ? "checkbox" : ("multiplechoice" as const),
    question,
    choices,
    ...(maxAttemptsRaw ? { maxAttempts: Number(maxAttemptsRaw) } : {}),
    ...(showAnswerRaw ? { showAnswer: showAnswerRaw } : {}),
    ...(explanation ? { explanation } : {}),
  };
}

function parseBlockFile(
  tag: string,
  urlName: string,
  files: Map<string, TarEntry>,
  warnings: string[],
  inlineEl?: Element,
): object | null {
  const path = `${tag}/${urlName}.xml`;
  const el = getXml(files, path) ?? inlineEl ?? null;

  if (tag === "html") {
    const displayName = el ? attr(el, "display_name") || attr(el, "displayName") || "HTML" : "HTML";
    // HTML content is in a separate .html file referenced by filename attr
    const filename = el ? (attr(el, "filename") || urlName) : urlName;
    const htmlPath = `html/${filename}.html`;
    const htmlContent = files.get(htmlPath)?.text ?? "";
    return { type: "html" as const, displayName, html: htmlContent };
  }

  if (tag === "video") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || attr(el, "displayName") || "Video";
    const youtubeId =
      attr(el, "youtube_id_1_0") ||
      attr(el, "youtubeId") ||
      (attr(el, "youtube") || "").replace(/^1\.0:/, "") ||
      "";

    // MP4 URL from html5_sources JSON array or first <source src="">
    let mp4Url = "";
    try {
      const raw = attr(el, "html5_sources");
      if (raw) {
        const arr = JSON.parse(raw.replace(/&quot;/g, '"')) as string[];
        mp4Url = arr[0] ?? "";
      }
    } catch { /* ignore */ }
    if (!mp4Url) {
      const srcEl = el.querySelector("source[src]");
      mp4Url = srcEl?.getAttribute("src") ?? "";
    }

    // Require either youtube or mp4 to avoid broken blocks
    if (!youtubeId && !mp4Url) {
      warnings.push(`Video "${displayName}": ไม่พบ YouTube ID หรือ MP4 URL — ข้าม`);
      return null;
    }

    // Transcripts: from <transcript language="en" src="file.srt"/> children
    const transcripts: { lang: string; srtFile: string }[] = [];
    for (const tEl of Array.from(el.querySelectorAll("transcript[language]"))) {
      const lang = tEl.getAttribute("language") || "";
      const srtFile = tEl.getAttribute("src") || "";
      if (lang && srtFile) transcripts.push({ lang, srtFile });
    }
    // Fallback: parse transcripts JSON dict attribute
    if (transcripts.length === 0) {
      try {
        const raw = attr(el, "transcripts");
        if (raw && raw !== "{}") {
          const map = JSON.parse(raw.replace(/&quot;/g, '"')) as Record<string, string>;
          for (const [lang, srtFile] of Object.entries(map)) {
            if (lang && srtFile) transcripts.push({ lang, srtFile });
          }
        }
      } catch { /* ignore */ }
    }

    const downloadAllowed = el.getAttribute("download_video") === "true";
    const edxVideoId = attr(el, "edx_video_id") || "";

    return {
      type: "video" as const,
      displayName,
      youtubeId,
      mp4Url,
      downloadAllowed,
      transcripts,
      edxVideoId,
    };
  }

  if (tag === "problem") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || attr(el, "displayName") || "Problem";
    return parseProblemFile(el, displayName, warnings);
  }

  if (tag === "discussion") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || attr(el, "displayName") || "Discussion";
    return {
      type: "discussion" as const,
      displayName,
      discussionCategory: attr(el, "discussion_category") || "General",
      discussionTarget: attr(el, "discussion_target") || displayName,
    };
  }

  if (tag === "lti_consumer" || tag === "lti") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || attr(el, "displayName") || "LTI Block";
    return {
      type: "lti" as const,
      displayName,
      ltiVersion: (attr(el, "lti_version") || "lti_1p3") as "lti_1p3" | "lti_1p1",
      launchUrl: attr(el, "lti_1p3_launch_url") || attr(el, "launch_url") || "",
      oidcUrl: attr(el, "lti_1p3_oidc_url") || "",
      keysetUrl: attr(el, "lti_1p3_tool_keyset_url") || "",
      hasScore: el.getAttribute("has_score") === "true",
      weight: Number(attr(el, "weight") || "1"),
      launchTarget: (attr(el, "launch_target") || "new_window") as "iframe" | "new_window",
      buttonText: attr(el, "button_text") || "",
    };
  }

  if (tag === "poll") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || "Poll";
    const question = attr(el, "question") || displayName;
    // answers is a JSON-encoded array of [id, {label, img, img_alt}]
    let answers: { id: string; label: string; img: string }[] = [];
    try {
      const raw = attr(el, "answers");
      if (raw) {
        const parsed = JSON.parse(raw.replace(/&quot;/g, '"')) as [string, { label: string; img?: string }][];
        answers = parsed.map(([id, obj]) => ({ id, label: obj.label || id, img: obj.img || "" }));
      }
    } catch { /* ignore */ }
    if (answers.length < 2) {
      answers = [{ id: "A", label: "ใช่", img: "" }, { id: "B", label: "ไม่ใช่", img: "" }];
    }
    return {
      type: "poll" as const,
      displayName,
      question,
      answers,
      privateResults: el.getAttribute("private_results") === "true",
      maxSubmissions: Number(attr(el, "max_submissions") || "1"),
      feedback: attr(el, "feedback") || "",
    };
  }

  if (tag === "openassessment") {
    // Use inlineEl if available (ORA is often inlined in vertical), else read file
    const oraEl = el;
    if (!oraEl) return null;
    const displayName = attr(oraEl, "display_name") || "Open Response Assessment";
    const submissionStart = attr(oraEl, "submission_start") || undefined;
    const submissionDue = attr(oraEl, "submission_due") || undefined;
    const hasFileUpload = attr(oraEl, "file_upload_response") === "required" || attr(oraEl, "file_upload_response") === "optional";
    const assessmentTypes = Array.from(oraEl.querySelectorAll("assessment[name]"))
      .map((a) => a.getAttribute("name") ?? "")
      .filter(Boolean);
    // Serialize the element back to raw XML for pass-through export
    const rawXml = new XMLSerializer().serializeToString(oraEl);
    return {
      type: "ora" as const,
      displayName,
      assessmentTypes,
      submissionStart,
      submissionDue,
      hasFileUpload,
      rawXml,
      rawUrlName: urlName,
    };
  }

  if (tag === "library_content") {
    const lcEl = el;
    if (!lcEl) return null;
    const displayName = attr(lcEl, "display_name") || "Library Content";
    const sourceLibraryId = attr(lcEl, "source_library_id") || "";
    const maxCount = Number(attr(lcEl, "max_count") || "1");
    const rawXml = new XMLSerializer().serializeToString(lcEl);
    return {
      type: "library_content" as const,
      displayName,
      sourceLibraryId,
      maxCount,
      rawXml,
      rawUrlName: urlName,
    };
  }

  // Unknown block — pass-through (serialize raw XML for round-trip export)
  const displayName = (el ? attr(el, "display_name") : "") || urlName || tag;
  const rawXml = el ? new XMLSerializer().serializeToString(el) : `<${tag} url_name="${urlName}"/>`;
  warnings.push(`Block ไม่รู้จัก <${tag}> "${displayName}" — เก็บแบบ pass-through`);
  return {
    type: "unknown" as const,
    displayName,
    blockType: tag,
    rawXml,
    rawUrlName: urlName,
  };
}

export type OlxParseResult = ParseXmlResult & { assets: Map<string, File> };

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif|svg)$/i;
const TRANSCRIPT_EXTS = /\.(srt|sjson|vtt)$/i;
const STATIC_PATHS = ["static/", "about/"];

// ─── Sumac Compatibility Validator ───────────────────────────────────────────
// ตรวจสอบ patterns ที่ทำให้เกิด orphan blocks เมื่อ import เข้า Ulmo.2+
// อ้างอิง: FlexspacePro Error-Analysis-Report.md

interface SumacIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

// Sumac ใช้ SHA1 20-char hex; Ulmo ใช้ UUID 32-char hex — ทั้งคู่ valid
const VALID_ID = /^[0-9a-f]{20,32}$/i;
// Generic names เช่น problem1, problem2, vertical3 ที่เกิดจาก copy/paste ใน Sumac
const GENERIC_NAME = /^(problem|vertical|html|video|discussion)\d+$/i;

function validateSumacCompatibility(
  files: Map<string, TarEntry>,
): SumacIssue[] {
  const issues: SumacIssue[] = [];

  for (const [path, entry] of files) {
    // ตรวจเฉพาะ XML ใน block directories
    if (!path.endsWith(".xml")) continue;
    const parts = path.split("/");
    if (parts.length < 2) continue;
    const [dir, filename] = [parts[0], parts[parts.length - 1]];
    const blockName = filename.replace(/\.xml$/, "");
    const isBlockDir = ["problem", "vertical", "html", "video", "discussion", "lti_consumer"].includes(dir);
    if (!isBlockDir) continue;

    // 1. Generic-named blocks (สาเหตุหลักของ orphan)
    if (GENERIC_NAME.test(blockName)) {
      issues.push({
        level: "error",
        file: path,
        message: `Generic block name "${blockName}" — เกิดจาก copy/paste ใน Sumac จะสร้าง orphan ใน Ulmo`,
      });
      continue; // ไม่ต้อง parse ต่อ
    }

    // 2. ตรวจ non-standard block names (ไม่ใช่ทั้ง UUID-32 และ Sumac SHA1-20)
    if (!VALID_ID.test(blockName)) {
      issues.push({
        level: "warning",
        file: path,
        message: `Block name "${blockName}" ไม่ใช่ ID มาตรฐาน — อาจเกิดปัญหาใน Ulmo`,
      });
    }

    // 3. Sumac-specific attributes ใน XML content
    const text = entry.text;

    if (text.includes('upstream="null"')) {
      issues.push({
        level: "warning",
        file: path,
        message: `พบ upstream="null" (Sumac Library v2 attribute) — ไม่ compatible กับ Ulmo`,
      });
    }

    if (text.includes("x-is-pointer-node")) {
      issues.push({
        level: "warning",
        file: path,
        message: `พบ x-is-pointer-node (Sumac Library v2 feature) — จะถูกละเว้นใน Ulmo`,
      });
    }

    if (text.includes("copied_from_block")) {
      issues.push({
        level: "warning",
        file: path,
        message: `พบ copied_from_block (Sumac Library v2) — Library ต้นฉบับต้องถูก import มาด้วย`,
      });
    }

    // 4. Library v1 reference (<library_content>)
    if (text.includes("<library_content") || text.includes("library-v1:")) {
      issues.push({
        level: "error",
        file: path,
        message: `พบ Library v1 reference — Deprecated ใน Ulmo และ Library ต้นฉบับต้องถูก import มาด้วย`,
      });
    }
  }

  return issues;
}

export async function parseOlxTar(buffer: ArrayBuffer): Promise<OlxParseResult> {
  const warnings: string[] = [];
  const files = await extractTar(buffer);

  // ── Auto-clean Sumac artifacts ─────────────────────────────────────────────
  cleanSumacFiles(files, warnings);

  // ── Sumac Compatibility Check (หลัง clean — เหลือเฉพาะปัญหาที่แก้ไม่ได้) ──
  const sumacIssues = validateSumacCompatibility(files);
  const errorCount = sumacIssues.filter((i) => i.level === "error").length;
  const warnCount  = sumacIssues.filter((i) => i.level === "warning").length;

  if (sumacIssues.length > 0) {
    warnings.push(
      `⚠️ ตรวจพบ ${errorCount} ปัญหาร้ายแรง และ ${warnCount} คำเตือนที่เกี่ยวกับ Sumac→Ulmo compatibility:`,
    );
    for (const issue of sumacIssues) {
      const icon = issue.level === "error" ? "🔴" : "🟡";
      warnings.push(`${icon} [${issue.file}] ${issue.message}`);
    }
    const hasGenericIssue = sumacIssues.some((i) => i.message.includes("Generic block name"));
    const hasLibraryV1 = sumacIssues.some((i) => i.message.includes("Library v1"));
    if (hasGenericIssue) {
      warnings.push(
        `💡 แนะนำ: ลบ Unit ที่มี generic block ใน Sumac Studio แล้ว Publish → Export ใหม่ก่อน Import`,
      );
    }
    if (hasLibraryV1) {
      warnings.push(
        `💡 แนะนำ: Library v1 ถูก deprecated ใน Ulmo — แปลงเป็น Library v2 ใน Sumac Studio หรือ import Library ต้นฉบับมาด้วย`,
      );
    }
  }

  // Entry point: course/course.xml or course.xml
  const coursePtr = getXml(files, "course/course.xml") ?? getXml(files, "course.xml");
  if (!coursePtr) throw new Error("ไม่พบ course/course.xml ในไฟล์ tar.gz");

  const run = attr(coursePtr, "url_name") || "run";
  const courseEl = getXml(files, `course/${run}.xml`);
  if (!courseEl) throw new Error(`ไม่พบ course/${run}.xml`);

  const org = attr(coursePtr, "org") || attr(courseEl, "org") || "ORG";
  const courseCode = attr(coursePtr, "course") || attr(courseEl, "course") || "COURSE";
  const displayName = attr(courseEl, "display_name") || attr(courseEl, "displayName") || "Course";
  const language = attr(courseEl, "language") || "th";
  const start = attr(courseEl, "start") || "2026-01-01T00:00:00Z";

  // Parse policy.json for course_image, dates, enrollment settings
  let courseImageName = "";
  let selfPaced = true;
  let courseEnd: string | undefined;
  let enrollmentStart: string | undefined;
  let enrollmentEnd: string | undefined;
  let invitationOnly = false;
  let catalogVisibility: "both" | "about" | "none" = "both";
  const policyText = files.get(`policies/${run}/policy.json`)?.text;
  if (policyText) {
    try {
      const policy = JSON.parse(policyText);
      const key = Object.keys(policy).find((k) => k.startsWith("course/"));
      const cp = key ? policy[key] : null;
      if (cp?.course_image) courseImageName = cp.course_image as string;
      if (cp?.self_paced !== undefined) selfPaced = !!cp.self_paced;
      if (cp?.end && cp.end !== "null") courseEnd = String(cp.end);
      if (cp?.enrollment_start && cp.enrollment_start !== "null") enrollmentStart = String(cp.enrollment_start);
      if (cp?.enrollment_end && cp.enrollment_end !== "null") enrollmentEnd = String(cp.enrollment_end);
      if (cp?.invitation_only) invitationOnly = !!cp.invitation_only;
      if (cp?.catalog_visibility && ["both", "about", "none"].includes(cp.catalog_visibility)) {
        catalogVisibility = cp.catalog_visibility as "both" | "about" | "none";
      }
    } catch { /* ignore */ }
  }

  // Read about/* files
  const readAbout = (name: string) => (files.get(`about/${name}`)?.text ?? "").trim();
  const overview = readAbout("overview.html");
  const shortDescription = readAbout("short_description.html");
  const effort = readAbout("effort.html");
  const duration = readAbout("duration.html");
  const subtitle = readAbout("subtitle.html");

  // Intro video: about/video.html contains a YouTube URL or ID
  const videoHtml = readAbout("video.html");
  const ytMatch = videoHtml.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    videoHtml.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    videoHtml.match(/([A-Za-z0-9_-]{11})/);
  const introVideoYoutubeId = ytMatch ? ytMatch[1] : "";

  // Parse grading policy from policies/<run>/grading_policy.json
  let cutoffs: Record<string, number> = { Pass: 0.5 };
  let graders: object[] = [];
  const gpText = files.get(`policies/${run}/grading_policy.json`)?.text;
  if (gpText) {
    try {
      const gp = JSON.parse(gpText);
      if (gp.GRADE_CUTOFFS) {
        cutoffs = Object.fromEntries(
          Object.entries(gp.GRADE_CUTOFFS).map(([k, v]) => [k, Number(v)]),
        );
      }
      if (Array.isArray(gp.GRADER)) {
        graders = gp.GRADER.map((g: Record<string, unknown>) => ({
          type: String(g.type ?? "Homework"),
          shortLabel: String(g.short_label ?? g.shortLabel ?? "HW"),
          minCount: Number(g.min_count ?? g.minCount ?? 1),
          dropCount: Number(g.drop_count ?? g.dropCount ?? 0),
          weight: Number(g.weight ?? 0),
        }));
      }
    } catch {
      warnings.push("ไม่สามารถอ่าน grading_policy.json — ใช้ค่าเริ่มต้น");
    }
  }

  // Extract static assets: images + SRT transcripts
  const assets = new Map<string, File>();
  for (const [path, entry] of files) {
    const isStatic = STATIC_PATHS.some((p) => path.startsWith(p));
    if (!isStatic) continue;
    const fileName = path.split("/").pop()!;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

    if (IMAGE_EXTS.test(path)) {
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
      };
      const mime = mimeMap[ext] ?? "image/jpeg";
      const buf = new Uint8Array(entry.binary).buffer as ArrayBuffer;
      assets.set(fileName, new File([buf], fileName, { type: mime }));
      if (!courseImageName && path.includes("about/image")) courseImageName = fileName;
    } else if (TRANSCRIPT_EXTS.test(path)) {
      const mime = ext === "srt" ? "text/plain" : ext === "vtt" ? "text/vtt" : "application/json";
      const buf = new Uint8Array(entry.binary).buffer as ArrayBuffer;
      assets.set(fileName, new File([buf], fileName, { type: mime }));
    }
  }

  // Walk chapters
  const chapterUrlNames = Array.from(courseEl.querySelectorAll(":scope > chapter")).map(
    (el) => attr(el, "url_name"),
  );

  const chapters = chapterUrlNames.flatMap((chUrlName) => {
    const chEl = getXml(files, `chapter/${chUrlName}.xml`);
    if (!chEl) {
      warnings.push(`ข้าม chapter url_name="${chUrlName}": ไม่พบไฟล์`);
      return [];
    }
    const chName = attr(chEl, "display_name") || attr(chEl, "displayName") || chUrlName;

    const seqUrlNames = Array.from(chEl.querySelectorAll(":scope > sequential")).map(
      (el) => attr(el, "url_name"),
    );

    const sequentials = seqUrlNames.flatMap((seqUrlName) => {
      const seqEl = getXml(files, `sequential/${seqUrlName}.xml`);
      if (!seqEl) {
        warnings.push(`ข้าม sequential url_name="${seqUrlName}": ไม่พบไฟล์`);
        return [];
      }
      const seqName = attr(seqEl, "display_name") || attr(seqEl, "displayName") || seqUrlName;
      const format = attr(seqEl, "format") || undefined;
      const seqStart = attr(seqEl, "start") || undefined;
      const seqDue = attr(seqEl, "due") && attr(seqEl, "due") !== "null" ? attr(seqEl, "due") : undefined;
      const showCorrectness = (attr(seqEl, "show_correctness") as "always" | "never" | "past_due") || undefined;

      const vertUrlNames = Array.from(seqEl.querySelectorAll(":scope > vertical")).map(
        (el) => attr(el, "url_name"),
      );

      const verticals = vertUrlNames.flatMap((vertUrlName) => {
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
          if (!urlName) {
            const block = parseBlockFile(tag, "", files, warnings, child);
            return block ? [block] : [];
          }
          // Always pass child as inlineEl so ORA/library_content can use it as fallback
          const block = parseBlockFile(tag, urlName, files, warnings, child);
          return block ? [block] : [];
        });

        if (blocks.length === 0) {
          warnings.push(`ข้าม vertical "${vertName}": ไม่มี block ที่ถูกต้อง`);
          return [];
        }
        return [{ displayName: vertName, blocks }];
      });

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

    if (sequentials.length === 0) {
      warnings.push(`ข้าม chapter "${chName}": ไม่มี sequential ที่ถูกต้อง`);
      return [];
    }
    return [{ displayName: chName, sequentials }];
  });

  if (chapters.length === 0) {
    throw new Error("ไม่พบเนื้อหาในไฟล์ OLX กรุณาตรวจสอบโครงสร้าง tar.gz");
  }

  const { courseSchema } = await import("./schema");
  const raw = {
    course: {
      org, courseCode, run, displayName, language, start, selfPaced,
      ...(courseEnd ? { end: courseEnd } : {}),
      ...(enrollmentStart ? { enrollmentStart } : {}),
      ...(enrollmentEnd ? { enrollmentEnd } : {}),
      ...(invitationOnly ? { invitationOnly } : {}),
      catalogVisibility,
    },
    about: { courseImageName, overview, shortDescription, effort, duration, subtitle, introVideoYoutubeId },
    grading: { cutoffs, graders },
    chapters,
  };

  const result = courseSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      warnings.push(`Schema: ${issue.message} (${issue.path.join(" › ")})`);
    }
    throw new Error(
      `Schema ไม่ถูกต้อง: ${result.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  return { course: result.data as Course, warnings, assets };
}
