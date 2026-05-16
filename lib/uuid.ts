// Cross-environment UUID v4 generator.
//
// Prefers crypto.randomUUID() (available in modern browsers + Electron),
// falls back to crypto.getRandomValues() to compose a v4-shaped string
// without the Date.now() + Math.random() shortcut, which is collision-prone
// when many IDs are minted within the same millisecond.
export function uuidV4(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    // Set version (4) and variant (10) bits per RFC 4122
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Truly last-ditch (no Web Crypto at all). Should never run in our targets.
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}
