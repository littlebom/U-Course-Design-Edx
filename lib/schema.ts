import { z } from "zod";

export const choiceSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
});

export const problemBlockSchema = z.object({
  type: z.literal("problem"),
  displayName: z.string().min(1),
  problemType: z.enum(["multiplechoice", "checkbox"]),
  question: z.string().min(1),
  choices: z.array(choiceSchema).min(2),
  maxAttempts: z.number().int().positive().optional(),
  showAnswer: z
    .enum(["always", "answered", "attempted", "closed", "finished", "past_due", "correct_or_past_due", "never"])
    .optional(),
  explanation: z.string().optional(),
});

export const htmlBlockSchema = z.object({
  type: z.literal("html"),
  displayName: z.string().min(1),
  html: z.string(),
});

export const videoBlockSchema = z.object({
  type: z.literal("video"),
  displayName: z.string().min(1),
  youtubeId: z.string().min(1),
  downloadAllowed: z.boolean().default(false),
});

export const blockSchema = z.discriminatedUnion("type", [
  htmlBlockSchema,
  problemBlockSchema,
  videoBlockSchema,
]);

export const verticalSchema = z.object({
  displayName: z.string().min(1),
  blocks: z.array(blockSchema).min(1),
});

export const sequentialSchema = z.object({
  displayName: z.string().min(1),
  format: z.string().optional(),
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
  })
  .default({
    shortDescription: "",
    overview: "",
    effort: "",
    duration: "",
    introVideoYoutubeId: "",
    subtitle: "",
  });

export const courseSchema = z.object({
  course: z.object({
    org: z.string().min(1),
    courseCode: z.string().min(1),
    run: z.string().min(1),
    displayName: z.string().min(1),
    language: z.string().default("en"),
    start: z.string().default("2026-01-01T00:00:00Z"),
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
export type Block = z.infer<typeof blockSchema>;
export type ProblemBlock = z.infer<typeof problemBlockSchema>;
export type HtmlBlock = z.infer<typeof htmlBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type Vertical = z.infer<typeof verticalSchema>;
export type Sequential = z.infer<typeof sequentialSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
