import type { Course } from "../schema";
import type { FileEntry } from "./tar";

export function buildAboutFiles(course: Course): FileEntry[] {
  const a = course.about;
  const files: FileEntry[] = [];
  const push = (name: string, body: string) =>
    files.push({ path: `course/about/${name}`, data: body });

  push("title.html", course.course.displayName);
  push("subtitle.html", a.subtitle);
  push("short_description.html", a.shortDescription);
  push("overview.html", a.overview || `<section class="about"><p>${escapeHtml(a.shortDescription)}</p></section>`);
  push("effort.html", a.effort);
  push("duration.html", a.duration);
  push(
    "video.html",
    a.introVideoYoutubeId
      ? `<iframe width="560" height="315" src="https://www.youtube.com/embed/${a.introVideoYoutubeId}" frameborder="0" allowfullscreen></iframe>`
      : "",
  );
  push("description.html", a.shortDescription);
  return files;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
