import { create } from "xmlbuilder2";
import type { ProblemBlock } from "../schema";

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

// Studio-style markdown generated only for choice-based problems; numerical /
// text don't have a stable markdown source-of-truth, so we leave `markdown`
// blank for them (Studio will fall back to the XML body for editing).
function toMarkdown(block: ProblemBlock): string {
  if (block.problemType !== "multiplechoice" && block.problemType !== "checkbox" && block.problemType !== "dropdown") {
    return "";
  }
  const lines: string[] = [];
  const plain = stripTags(block.question);
  if (plain) lines.push(plain);
  const choices = block.choices ?? [];
  if (block.problemType === "dropdown") {
    // Studio dropdown markdown uses [[ ... ]] with (correct) marker
    lines.push("[[");
    for (const c of choices) {
      lines.push(c.correct ? `(${c.text})` : c.text);
    }
    lines.push("]]");
  } else {
    const isMC = block.problemType === "multiplechoice";
    for (const c of choices) {
      const mark = c.correct ? "x" : " ";
      lines.push(isMC ? `(${mark}) ${c.text}` : `[${mark}] ${c.text}`);
    }
  }
  if (block.explanation) {
    lines.push("", "[explanation]", block.explanation, "[explanation]");
  }
  return lines.join("\n") + "\n";
}

export function buildProblemBlock(block: ProblemBlock): string {
  const attrs: Record<string, string> = {
    display_name: block.displayName,
    max_attempts: String(block.maxAttempts ?? 1),
    showanswer: block.showAnswer ?? "closed",
  };
  const md = toMarkdown(block);
  if (md) attrs.markdown = md;
  const root = create({ version: "1.0" }).ele("problem", attrs);

  const choices = block.choices ?? [];

  switch (block.problemType) {
    case "multiplechoice": {
      const r = root.ele("multiplechoiceresponse");
      r.ele("p").txt(stripTags(block.question));
      const g = r.ele("choicegroup", { type: "MultipleChoice" });
      for (const c of choices) {
        g.ele("choice", { correct: c.correct ? "true" : "false" }).txt(c.text);
      }
      break;
    }
    case "checkbox": {
      const r = root.ele("choiceresponse");
      r.ele("p").txt(stripTags(block.question));
      const g = r.ele("checkboxgroup");
      for (const c of choices) {
        g.ele("choice", { correct: c.correct ? "true" : "false" }).txt(c.text);
      }
      break;
    }
    case "dropdown": {
      const r = root.ele("optionresponse");
      r.ele("p").txt(stripTags(block.question));
      const oi = r.ele("optioninput");
      for (const c of choices) {
        oi.ele("option", { correct: c.correct ? "True" : "False" }).txt(c.text);
      }
      break;
    }
    case "numerical": {
      const r = root.ele("numericalresponse", {
        answer: block.numericalAnswer != null ? String(block.numericalAnswer) : "0",
      });
      r.ele("p").txt(stripTags(block.question));
      const tol = (block.numericalTolerance ?? "").trim();
      if (tol) {
        r.ele("responseparam", { type: "tolerance", default: tol });
      }
      r.ele("formulaequationinput");
      break;
    }
    case "text": {
      const answers = block.textAnswers ?? [];
      const matchMode = block.textMatchMode ?? "exact";
      // Map UI match mode → OLX type attribute
      const typeAttr: Record<string, string> = {
        exact: "",
        ci: "ci",
        regex: "regexp",
        "ci-regex": "ci regexp",
      };
      const primary = answers[0] ?? "";
      const r = root.ele("stringresponse", {
        answer: primary,
        ...(typeAttr[matchMode] ? { type: typeAttr[matchMode] } : {}),
      });
      r.ele("p").txt(stripTags(block.question));
      // Extra answers
      for (let i = 1; i < answers.length; i++) {
        r.ele("additional_answer", { answer: answers[i] });
      }
      r.ele("textline", { size: "20" });
      break;
    }
  }

  if (block.explanation) {
    root.ele("solution").ele("div", { class: "detailed-solution" }).txt(block.explanation);
  }

  return root.end({ prettyPrint: true, headless: true });
}
