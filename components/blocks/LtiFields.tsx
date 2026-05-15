"use client";

import type { LtiBlock } from "@/lib/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BlockUpdateFn } from "./types";

export function LtiFields({ block, update }: { block: LtiBlock; update: BlockUpdateFn }) {
  const set = (fn: (b: LtiBlock) => void) => update((b) => fn(b as LtiBlock));
  return (
    <div className="space-y-3">
      <div>
        <Label>LTI Version</Label>
        <select
          value={block.ltiVersion}
          onChange={(e) => set((b) => (b.ltiVersion = e.target.value as "lti_1p3" | "lti_1p1"))}
          className="w-full rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="lti_1p3">LTI 1.3 (แนะนำ)</option>
          <option value="lti_1p1">LTI 1.1 (เก่า)</option>
        </select>
      </div>
      <div>
        <Label>Launch URL *</Label>
        <Input
          value={block.launchUrl}
          onChange={(e) => set((b) => (b.launchUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/launch"
        />
      </div>
      <div>
        <Label>OIDC Login URL (LTI 1.3)</Label>
        <Input
          value={block.oidcUrl}
          onChange={(e) => set((b) => (b.oidcUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/login"
        />
      </div>
      <div>
        <Label>Keyset URL (LTI 1.3)</Label>
        <Input
          value={block.keysetUrl}
          onChange={(e) => set((b) => (b.keysetUrl = e.target.value))}
          placeholder="https://tool.example.com/lti/jwks"
        />
      </div>
      <div>
        <Label>ข้อความปุ่ม (Button Text)</Label>
        <Input
          value={block.buttonText}
          onChange={(e) => set((b) => (b.buttonText = e.target.value))}
          placeholder="เปิดแบบทดสอบ"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Launch Target</Label>
          <select
            value={block.launchTarget}
            onChange={(e) => set((b) => (b.launchTarget = e.target.value as "iframe" | "new_window"))}
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="new_window">New Window</option>
            <option value="iframe">iFrame</option>
          </select>
        </div>
        <div className="flex-1">
          <Label>น้ำหนักคะแนน (Weight)</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={block.weight}
            onChange={(e) => set((b) => (b.weight = Number(e.target.value)))}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lti-has-score"
          checked={block.hasScore}
          onChange={(e) => set((b) => (b.hasScore = e.target.checked))}
        />
        <Label htmlFor="lti-has-score">มีคะแนน (has_score)</Label>
      </div>
    </div>
  );
}
