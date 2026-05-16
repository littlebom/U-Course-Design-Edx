"use client";

// Shared "save bytes as file" helper — every export path in the app used to
// duplicate the createObjectURL → <a>.click → revokeObjectURL dance. Funnel
// everything through here so cleanup and edge cases live in one place.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function downloadText(text: string, filename: string, mime = "text/plain"): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

// Open a static asset from /public for download (e.g. template files).
export function downloadStatic(path: string, filename?: string): void {
  const a = document.createElement("a");
  a.href = path;
  a.download = filename ?? path.replace(/^\//, "");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
