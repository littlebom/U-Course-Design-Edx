import { create } from "xmlbuilder2";
import type { ProblemBlock } from "../schema";

function toMarkdown(block: ProblemBlock): string {
  const lines: string[] = [];
  const plain = block.question.replace(/<[^>]+>/g, "").trim();
  if (plain) lines.push(plain);
  const isMC = block.problemType === "multiplechoice";
  for (const c of block.choices) {
    const mark = c.correct ? "x" : " ";
    lines.push(isMC ? `(${mark}) ${c.text}` : `[${mark}] ${c.text}`);
  }
  if (block.explanation) {
    lines.push("", "[explanation]", block.explanation, "[explanation]");
  }
  return lines.join("\n") + "\n";
}

export function buildProblemBlock(block: ProblemBlock): string {
  const root = create({ version: "1.0" }).ele("problem", {
    display_name: block.displayName,
    markdown: toMarkdown(block),
    max_attempts: String(block.maxAttempts ?? 1),
    showanswer: block.showAnswer ?? "closed",
  });

  if (block.problemType === "multiplechoice") {
    const r = root.ele("multiplechoiceresponse");
    r.ele("p").txt(stripTags(block.question));
    const g = r.ele("choicegroup", { type: "MultipleChoice" });
    for (const c of block.choices) {
      g.ele("choice", { correct: c.correct ? "true" : "false" }).txt(c.text);
    }
  } else {
    const r = root.ele("choiceresponse");
    r.ele("p").txt(stripTags(block.question));
    const g = r.ele("checkboxgroup");
    for (const c of block.choices) {
      g.ele("choice", { correct: c.correct ? "true" : "false" }).txt(c.text);
    }
  }

  if (block.explanation) {
    root.ele("solution").ele("div", { class: "detailed-solution" }).txt(block.explanation);
  }

  return root.end({ prettyPrint: true, headless: true });
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
