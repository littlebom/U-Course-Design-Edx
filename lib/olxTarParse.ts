"use client";

// Backwards-compat shim — the implementation moved to lib/olx/import/*.
// Re-export so existing imports (OlxDropzone, etc.) keep working.
export { parseOlxTar, type OlxParseResult } from "./olx/import";
