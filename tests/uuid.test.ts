import { describe, expect, it } from "vitest";
import { uuidV4 } from "@/lib/uuid";

describe("uuidV4", () => {
  it("produces a v4-shaped string", () => {
    const id = uuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("does not collide across rapid calls", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(uuidV4());
    expect(set.size).toBe(1000);
  });
});
