"use client";

import type { Course } from "../schema";
import { sampleCourse } from "../sample";

// Return a blank course skeleton suitable for "Create new" in the library.
export function emptyCourseSeed(): Course {
  return structuredClone({
    ...sampleCourse,
    course: {
      ...sampleCourse.course,
      displayName: "Welcome to Open Edx",
      org: "YY",
      run: `run-${Date.now()}`,
    },
    chapters: [
      {
        displayName: "Section 1",
        sequentials: [
          {
            displayName: "Subsection 1",
            verticals: [
              {
                displayName: "Unit 1",
                blocks: [{ type: "html", displayName: "HTML", html: "<p>เริ่มต้นที่นี่</p>" }],
              },
            ],
          },
        ],
      },
    ],
  });
}

export function sampleCourseSeed(): Course {
  return structuredClone(sampleCourse);
}
