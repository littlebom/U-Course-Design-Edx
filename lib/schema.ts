import { z } from "zod";

export const choiceSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
});

// Five Open edX "common problem" types — choice-based (3) + answer-based (2).
//   - multiplechoice → <multiplechoiceresponse> + <choicegroup>     (single select)
//   - checkbox       → <choiceresponse> + <checkboxgroup>            (multi-select)
//   - dropdown       → <optionresponse> + <optioninput><option>      (dropdown)
//   - numerical      → <numericalresponse> + tolerance               (number input)
//   - text           → <stringresponse> + optional regex/ci          (text input)
export const textMatchModeSchema = z.enum(["exact", "ci", "regex", "ci-regex"]);
export type TextMatchMode = z.infer<typeof textMatchModeSchema>;

export const problemBlockSchema = z.object({
  type: z.literal("problem"),
  displayName: z.string().min(1),
  problemType: z.enum(["multiplechoice", "checkbox", "dropdown", "numerical", "text"]),
  question: z.string().min(1),
  // Choice-based fields (used by multiplechoice / checkbox / dropdown)
  choices: z.array(choiceSchema).optional(),
  // Numerical-input fields
  numericalAnswer: z.number().optional(),
  // Tolerance string allows "0.01" or "2%" — Studio's native format
  numericalTolerance: z.string().optional(),
  // Text-input fields
  textAnswers: z.array(z.string()).optional(),
  textMatchMode: textMatchModeSchema.optional(),
  // Common across all types
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

export const videoTranscriptSchema = z.object({
  lang: z.string().min(1),   // e.g. "en", "th"
  srtFile: z.string(),       // filename in static/, e.g. "uuid-en.srt"
});

export const videoBlockSchema = z.object({
  type: z.literal("video"),
  displayName: z.string().min(1),
  youtubeId: z.string().default(""),
  mp4Url: z.string().default(""),
  downloadAllowed: z.boolean().default(false),
  transcripts: z.array(videoTranscriptSchema).default([]),
  edxVideoId: z.string().default(""),
});

export const discussionBlockSchema = z.object({
  type: z.literal("discussion"),
  displayName: z.string().min(1),
  discussionCategory: z.string().default("General"),
  discussionTarget: z.string().default(""),
});

export const ltiBlockSchema = z.object({
  type: z.literal("lti"),
  displayName: z.string().min(1),
  ltiVersion: z.enum(["lti_1p3", "lti_1p1"]).default("lti_1p3"),
  launchUrl: z.string().min(1),
  oidcUrl: z.string().default(""),
  keysetUrl: z.string().default(""),
  hasScore: z.boolean().default(false),
  weight: z.number().default(1.0),
  launchTarget: z.enum(["iframe", "new_window"]).default("new_window"),
  buttonText: z.string().default(""),
});
export type LtiBlock = z.infer<typeof ltiBlockSchema>;

export const pollAnswerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  img: z.string().default(""),
});

export const pollBlockSchema = z.object({
  type: z.literal("poll"),
  displayName: z.string().min(1),
  question: z.string().min(1),
  answers: z.array(pollAnswerSchema).min(2),
  privateResults: z.boolean().default(false),
  maxSubmissions: z.number().int().min(1).default(1),
  feedback: z.string().default(""),
});
export type PollBlock = z.infer<typeof pollBlockSchema>;
export type PollAnswer = z.infer<typeof pollAnswerSchema>;

// ORA — Open Response Assessment (pass-through: rawXml preserved exactly)
export const oraBlockSchema = z.object({
  type: z.literal("ora"),
  displayName: z.string().min(1),
  // Summary fields parsed for display purposes only
  assessmentTypes: z.array(z.string()).default([]),  // ["peer-assessment", "self-assessment", ...]
  submissionStart: z.string().optional(),
  submissionDue: z.string().optional(),
  hasFileUpload: z.boolean().default(false),
  // Full serialized XML element — written verbatim on export
  rawXml: z.string(),
  rawUrlName: z.string().default(""),
});
export type OraBlock = z.infer<typeof oraBlockSchema>;

// Library Content — randomized exam from Content Library (pass-through)
export const libraryContentBlockSchema = z.object({
  type: z.literal("library_content"),
  displayName: z.string().min(1),
  sourceLibraryId: z.string(),  // e.g. "library-v1:ORG+LIB_NAME"
  maxCount: z.number().int().positive().default(1),
  // Full serialized XML element — written verbatim on export
  rawXml: z.string(),
  rawUrlName: z.string().default(""),
});
export type LibraryContentBlock = z.infer<typeof libraryContentBlockSchema>;

export const unknownBlockSchema = z.object({
  type: z.literal("unknown"),
  displayName: z.string().default("Unknown Block"),
  blockType: z.string(),
  rawXml: z.string(),
  rawUrlName: z.string(),
});
export type UnknownBlock = z.infer<typeof unknownBlockSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  htmlBlockSchema,
  problemBlockSchema,
  videoBlockSchema,
  discussionBlockSchema,
  ltiBlockSchema,
  pollBlockSchema,
  oraBlockSchema,
  libraryContentBlockSchema,
  unknownBlockSchema,
]);

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
export type Block = z.infer<typeof blockSchema>;
export type ProblemBlock = z.infer<typeof problemBlockSchema>;
export type HtmlBlock = z.infer<typeof htmlBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type VideoTranscript = z.infer<typeof videoTranscriptSchema>;
export type DiscussionBlock = z.infer<typeof discussionBlockSchema>;
export type Vertical = z.infer<typeof verticalSchema>;
export type Sequential = z.infer<typeof sequentialSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
