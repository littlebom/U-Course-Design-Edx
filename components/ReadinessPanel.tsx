"use client";

import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessCheck, ReadinessReport } from "@/lib/readiness";

const STATUS_META: Record<
  ReadinessReport["status"],
  { label: string; pill: string; bar: string }
> = {
  ready: { label: "พร้อม", pill: "bg-success/15 text-success ring-success/20", bar: "bg-success" },
  almost: {
    label: "เกือบพร้อม",
    pill: "bg-warning/15 text-warning ring-warning/20",
    bar: "bg-warning",
  },
  "not-ready": {
    label: "ยังไม่พร้อม",
    pill: "bg-destructive/15 text-destructive ring-destructive/20",
    bar: "bg-destructive",
  },
};

function CheckRow({ check }: { check: ReadinessCheck }) {
  const icon = check.passed ? (
    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
  ) : check.severity === "fail" ? (
    <XCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
  ) : check.severity === "warn" ? (
    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
  ) : (
    <Info size={14} className="mt-0.5 shrink-0 text-default-400" />
  );

  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs odd:bg-default-50">
      {icon}
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium", check.passed ? "text-default-700" : "text-default-900")}>
          {check.title}
        </div>
        <div className="text-default-500">{check.detail}</div>
        {!check.passed && check.items && check.items.length > 0 && (
          <ul className="mt-0.5 list-inside list-disc text-2xs text-default-400">
            {check.items.slice(0, 6).map((it, i) => (
              <li key={i} className="truncate">
                {it}
              </li>
            ))}
            {check.items.length > 6 && <li>…และอีก {check.items.length - 6} รายการ</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ReadinessPanel({ report }: { report: ReadinessReport }) {
  const meta = STATUS_META[report.status];
  const compat = report.checks.filter((c) => c.category === "compat");
  const quality = report.checks.filter((c) => c.category === "quality");

  return (
    <div className="space-y-3">
      {/* Score header */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-2xl font-bold tabular-nums text-default-900">{report.score}%</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ring-1",
              meta.pill,
            )}
          >
            {meta.label}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-default-100">
          <div className={cn("h-full rounded-full transition-all", meta.bar)} style={{ width: `${report.score}%` }} />
        </div>
        {report.summary.fail > 0 && (
          <p className="mt-1 text-2xs text-destructive">
            มี {report.summary.fail} ข้อที่บล็อกการ import — ต้องแก้ก่อน
          </p>
        )}
      </div>

      <div>
        <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-default-400">
          ความเข้ากันได้กับ Ulmo
        </div>
        <div className="space-y-0.5">
          {compat.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-2xs font-semibold uppercase tracking-wider text-default-400">
          คุณภาพเนื้อหา
        </div>
        <div className="space-y-0.5">
          {quality.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </div>
      </div>

      <p className="text-2xs text-default-400">
        * เครื่องมือนี้ช่วยดักปัญหาก่อน แต่ไม่การันตีแทนการทดสอบ import จริงเข้า Ulmo Studio/LMS
      </p>
    </div>
  );
}
