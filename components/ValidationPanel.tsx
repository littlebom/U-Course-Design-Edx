"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ValidationIssue } from "@/lib/validate";

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success ring-1 ring-success/20">
        <CheckCircle2 size={16} /> พร้อม Export
      </div>
    );
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <div className="space-y-1.5">
      {errors.map((i, k) => (
        <div
          key={`e${k}`}
          className="flex items-start gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive ring-1 ring-destructive/20"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{i.message}</span>
        </div>
      ))}
      {warnings.map((i, k) => (
        <div
          key={`w${k}`}
          className="flex items-start gap-2 rounded-md bg-warning/10 px-2.5 py-1.5 text-xs text-warning-foreground ring-1 ring-warning/20"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
          <span className="text-default-700">{i.message}</span>
        </div>
      ))}
    </div>
  );
}
