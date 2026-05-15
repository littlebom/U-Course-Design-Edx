"use client";

import { attr, getXml, type TarEntry } from "./tar";
import { parseProblemFile } from "./parse-problem";

export function parseBlockFile(
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
    const filename = el ? (attr(el, "filename") || urlName) : urlName;
    const htmlContent = files.get(`html/${filename}.html`)?.text ?? "";
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

    // MP4 URL: html5_sources JSON array, fallback to first <source src="">
    let mp4Url = "";
    try {
      const raw = attr(el, "html5_sources");
      if (raw) {
        const arr = JSON.parse(raw.replace(/&quot;/g, '"')) as string[];
        mp4Url = arr[0] ?? "";
      }
    } catch { /* ignore */ }
    if (!mp4Url) {
      mp4Url = el.querySelector("source[src]")?.getAttribute("src") ?? "";
    }

    if (!youtubeId && !mp4Url) {
      warnings.push(`Video "${displayName}": ไม่พบ YouTube ID หรือ MP4 URL — ข้าม`);
      return null;
    }

    const transcripts: { lang: string; srtFile: string }[] = [];
    for (const tEl of Array.from(el.querySelectorAll("transcript[language]"))) {
      const lang = tEl.getAttribute("language") || "";
      const srtFile = tEl.getAttribute("src") || "";
      if (lang && srtFile) transcripts.push({ lang, srtFile });
    }
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

    return {
      type: "video" as const,
      displayName,
      youtubeId,
      mp4Url,
      downloadAllowed: el.getAttribute("download_video") === "true",
      transcripts,
      edxVideoId: attr(el, "edx_video_id") || "",
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
      question: attr(el, "question") || displayName,
      answers,
      privateResults: el.getAttribute("private_results") === "true",
      maxSubmissions: Number(attr(el, "max_submissions") || "1"),
      feedback: attr(el, "feedback") || "",
    };
  }

  if (tag === "openassessment") {
    if (!el) return null;
    const displayName = attr(el, "display_name") || "Open Response Assessment";
    const submissionStart = attr(el, "submission_start") || undefined;
    const submissionDue = attr(el, "submission_due") || undefined;
    const fileUpload = attr(el, "file_upload_response");
    const hasFileUpload = fileUpload === "required" || fileUpload === "optional";
    const assessmentTypes = Array.from(el.querySelectorAll("assessment[name]"))
      .map((a) => a.getAttribute("name") ?? "")
      .filter(Boolean);
    return {
      type: "ora" as const,
      displayName,
      assessmentTypes,
      submissionStart,
      submissionDue,
      hasFileUpload,
      rawXml: new XMLSerializer().serializeToString(el),
      rawUrlName: urlName,
    };
  }

  if (tag === "library_content") {
    if (!el) return null;
    return {
      type: "library_content" as const,
      displayName: attr(el, "display_name") || "Library Content",
      sourceLibraryId: attr(el, "source_library_id") || "",
      maxCount: Number(attr(el, "max_count") || "1"),
      rawXml: new XMLSerializer().serializeToString(el),
      rawUrlName: urlName,
    };
  }

  // Unknown block — pass-through
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
