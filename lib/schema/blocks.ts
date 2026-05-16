import { z } from "zod";

// ── Choice (shared by MCQ / Checkbox / Dropdown) ───────────────────────
export const choiceSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
  // Per-choice feedback (<choicehint> in OLX) — shown after the learner picks this option
  hint: z.string().optional(),
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
  // ── Feature parity with Studio "Common Problems" ───────────────────────
  // Scoring weight — applied at problem level (default 1.0 in OLX)
  weight: z.number().nonnegative().optional(),
  // Shuffle choices each load (applies to multiplechoice / checkbox only)
  shuffle: z.boolean().optional(),
  // Demand hints — learner clicks "Hint" button to reveal sequentially
  demandHints: z.array(z.string()).optional(),
  // Partial credit (multi-select only): "EDC" = Every Decision Counts, "halves" = half-credit
  partialCredit: z.enum(["EDC", "halves"]).optional(),
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

export const unknownBlockSchema = z.object({
  type: z.literal("unknown"),
  displayName: z.string().default("Unknown Block"),
  blockType: z.string(),
  rawXml: z.string(),
  rawUrlName: z.string(),
});

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

// ── Inferred types ─────────────────────────────────────────────────────
export type Block = z.infer<typeof blockSchema>;
export type ProblemBlock = z.infer<typeof problemBlockSchema>;
export type HtmlBlock = z.infer<typeof htmlBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type VideoTranscript = z.infer<typeof videoTranscriptSchema>;
export type DiscussionBlock = z.infer<typeof discussionBlockSchema>;
export type LtiBlock = z.infer<typeof ltiBlockSchema>;
export type PollBlock = z.infer<typeof pollBlockSchema>;
export type PollAnswer = z.infer<typeof pollAnswerSchema>;
export type OraBlock = z.infer<typeof oraBlockSchema>;
export type LibraryContentBlock = z.infer<typeof libraryContentBlockSchema>;
export type UnknownBlock = z.infer<typeof unknownBlockSchema>;
