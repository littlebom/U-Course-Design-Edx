"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  /** Page-identity content (title, course name, breadcrumb…) shown left of the divider */
  brand?: React.ReactNode;
  /** Left-aligned chips/widgets shown after the brand (e.g. save indicator, switcher) */
  left?: React.ReactNode;
  /** Right-aligned action buttons */
  right?: React.ReactNode;
  /** When true, prepends an "← รายวิชา" back button */
  showBackToCourses?: boolean;
};

// Shared top navigation used by /, /courses, /markdown so all pages have the
// same visual rhythm: clickable logo → /courses, optional back button, brand
// area, action cluster on the right.
export function Navbar({ brand, left, right, showBackToCourses = false }: Props) {
  const router = useRouter();
  const goHome = () => router.push("/courses");

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-header px-4 py-2.5 shadow-base">
      {/* Logo — clickable, returns to library */}
      <button
        type="button"
        onClick={goHome}
        title="กลับไปยังรายวิชาทั้งหมด"
        className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-base transition-opacity hover:opacity-80"
      >
        <GraduationCap size={18} />
      </button>

      {showBackToCourses && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goHome}
          className="!gap-1 !px-2 text-default-500 hover:text-primary"
          title="กลับไปยังรายวิชาทั้งหมด"
        >
          <ArrowLeft size={14} /> รายวิชา
        </Button>
      )}

      {brand && (
        <>
          <Separator orientation="vertical" className="h-6" />
          {brand}
        </>
      )}

      {left}

      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </header>
  );
}
