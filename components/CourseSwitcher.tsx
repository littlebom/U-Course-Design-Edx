"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown } from "lucide-react";
import type { CourseRecord } from "@/lib/db/types";
import { listCourses } from "@/lib/db/courses";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function CourseSwitcher({ currentCourseId }: { currentCourseId: string | null }) {
  const router = useRouter();
  const [recent, setRecent] = useState<CourseRecord[]>([]);

  useEffect(() => {
    listCourses(false).then((list) => setRecent(list.slice(0, 5))).catch(() => {});
  }, [currentCourseId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-default-500 hover:text-default-700">
          <BookOpen size={14} className="me-1.5" /> รายวิชา
          <ChevronDown size={11} className="ms-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-default-400">
          เปิดล่าสุด
        </DropdownMenuLabel>
        {recent.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-default-400">ยังไม่มีรายวิชา</div>
        ) : (
          recent.map((c) => (
            <DropdownMenuItem
              key={c.id}
              className={c.id === currentCourseId ? "!bg-primary/10 !text-primary" : ""}
              onClick={() => router.push(`/?courseId=${c.id}`)}
            >
              <span className="truncate">{c.name}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/courses")}>
          ดูทั้งหมด…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
