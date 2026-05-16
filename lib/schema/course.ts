import { z } from "zod";
import { blockSchema } from "./blocks";

export const verticalSchema = z.object({
  displayName: z.string().min(1),
  blocks: z.array(blockSchema).min(1),
});

export const sequentialSchema = z.object({
  displayName: z.string().min(1),
  format: z.string().optional(),
  start: z.string().optional(),
  due: z.string().optional(),
  showCorrectness: z.enum(["always", "never", "past_due"]).optional(),
  verticals: z.array(verticalSchema).min(1),
});

export const chapterSchema = z.object({
  displayName: z.string().min(1),
  sequentials: z.array(sequentialSchema).min(1),
});

export const graderSchema = z.object({
  type: z.string().min(1),
  shortLabel: z.string().min(1),
  minCount: z.number().int().positive(),
  dropCount: z.number().int().nonnegative().default(0),
  weight: z.number().min(0).max(1),
});

export const courseAboutSchema = z
  .object({
    shortDescription: z.string().default(""),
    overview: z.string().default(""),
    effort: z.string().default(""),
    duration: z.string().default(""),
    introVideoYoutubeId: z.string().default(""),
    subtitle: z.string().default(""),
    courseImageName: z.string().default(""),
  })
  .default({
    shortDescription: "",
    overview: "",
    effort: "",
    duration: "",
    introVideoYoutubeId: "",
    subtitle: "",
    courseImageName: "",
  });

export const courseSchema = z.object({
  course: z.object({
    org: z.string().min(1),
    courseCode: z.string().min(1),
    run: z.string().min(1),
    displayName: z.string().min(1),
    language: z.string().default("en"),
    start: z.string().default("2026-01-01T00:00:00Z"),
    end: z.string().optional(),
    enrollmentStart: z.string().optional(),
    enrollmentEnd: z.string().optional(),
    invitationOnly: z.boolean().default(false),
    catalogVisibility: z.enum(["both", "about", "none"]).default("both"),
    selfPaced: z.boolean().default(true),
  }),
  about: courseAboutSchema,
  grading: z
    .object({
      cutoffs: z.record(z.string(), z.number()).default({ Pass: 0.5 }),
      graders: z.array(graderSchema).default([]),
    })
    .default({ cutoffs: { Pass: 0.5 }, graders: [] }),
  chapters: z.array(chapterSchema).min(1),
});

export type Course = z.infer<typeof courseSchema>;
export type Vertical = z.infer<typeof verticalSchema>;
export type Sequential = z.infer<typeof sequentialSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
