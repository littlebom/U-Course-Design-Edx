"use client";

// Parse a <problem> OLX file. Supports five common Open edX problem types:
// multiplechoice / checkbox / dropdown / numerical / text.
export function parseProblemFile(
  el: Element,
  displayName: string,
  warnings: string[],
): object | null {
  const isCheckbox = !!el.querySelector("checkboxgroup");
  const isDropdown = !!el.querySelector("optionresponse");
  const isNumerical = !!el.querySelector("numericalresponse");
  const isText = !!el.querySelector("stringresponse");

  const qEl = el.querySelector("label") ?? el.querySelector("p") ?? el.querySelector("legend");
  const question = qEl ? `<p>${qEl.textContent?.trim()}</p>` : `<p>${displayName}</p>`;
  const solutionEl = el.querySelector("solution div, solution p");
  const explanation = solutionEl?.textContent?.trim() || undefined;
  const maxAttemptsRaw = el.getAttribute("max_attempts");
  const showAnswerRaw = el.getAttribute("showanswer");
  const weightRaw = el.getAttribute("weight");

  // Demand hints: <demandhint><hint>...</hint>…</demandhint>
  const demandHints = Array.from(el.querySelectorAll("demandhint > hint"))
    .map((h) => h.textContent?.trim() ?? "")
    .filter(Boolean);

  const common = {
    type: "problem" as const,
    displayName,
    question,
    ...(maxAttemptsRaw ? { maxAttempts: Number(maxAttemptsRaw) } : {}),
    ...(showAnswerRaw ? { showAnswer: showAnswerRaw } : {}),
    ...(explanation ? { explanation } : {}),
    ...(weightRaw && !Number.isNaN(Number(weightRaw)) ? { weight: Number(weightRaw) } : {}),
    ...(demandHints.length > 0 ? { demandHints } : {}),
  };

  // ── Numerical ────────────────────────────────────────────────────────────
  if (isNumerical) {
    const r = el.querySelector("numericalresponse")!;
    const answerRaw = r.getAttribute("answer") ?? "0";
    const numericalAnswer = Number(answerRaw) || 0;
    const tolEl = r.querySelector("responseparam[type='tolerance']");
    const numericalTolerance = tolEl?.getAttribute("default") ?? "0";
    return { ...common, problemType: "numerical" as const, numericalAnswer, numericalTolerance };
  }

  // ── Text ─────────────────────────────────────────────────────────────────
  if (isText) {
    const r = el.querySelector("stringresponse")!;
    const primary = r.getAttribute("answer") ?? "";
    const extras = Array.from(r.querySelectorAll("additional_answer"))
      .map((a) => a.getAttribute("answer") ?? "")
      .filter(Boolean);
    const textAnswers = [primary, ...extras].filter(Boolean);
    if (textAnswers.length === 0) textAnswers.push("");

    const typeAttr = (r.getAttribute("type") ?? "").toLowerCase();
    let textMatchMode: "exact" | "ci" | "regex" | "ci-regex" = "exact";
    if (typeAttr.includes("regexp") && typeAttr.includes("ci")) textMatchMode = "ci-regex";
    else if (typeAttr.includes("regexp")) textMatchMode = "regex";
    else if (typeAttr.includes("ci")) textMatchMode = "ci";

    return { ...common, problemType: "text" as const, textAnswers, textMatchMode };
  }

  // ── Choice-based (multiplechoice / checkbox / dropdown) ──────────────────
  let choices: { text: string; correct: boolean; hint?: string }[] = [];
  if (isDropdown) {
    // Multi-part problems may have several <optionresponse> blocks — use only the first
    const firstOptInput = el.querySelector("optioninput");
    const optionEls = firstOptInput?.querySelectorAll("option") ?? [];
    choices = Array.from(optionEls).map((o) => ({
      text: (o.textContent?.replace(/\s+/g, " ") ?? "").trim(),
      correct: o.getAttribute("correct")?.toLowerCase() === "true",
    }));
  } else {
    const choiceEls = el.querySelectorAll("choicegroup > choice, checkboxgroup > choice");
    choices = Array.from(choiceEls).map((c) => {
      const correct = c.getAttribute("correct") === "true";
      // Per-choice hint: <choicehint>…</choicehint> nested in <choice>
      const hintEl = c.querySelector(":scope > choicehint");
      const hint = hintEl?.textContent?.trim() || undefined;
      // Choice text = textContent minus the hint subtree
      const textParts: string[] = [];
      for (const node of Array.from(c.childNodes)) {
        if (node.nodeType === 1 && (node as Element).tagName === "choicehint") continue;
        textParts.push(node.textContent ?? "");
      }
      const text = textParts.join("").trim().replace(/\s+/g, " ");
      return { text, correct, ...(hint ? { hint } : {}) };
    });
  }

  if (choices.length < 2) {
    warnings.push(`Problem "${displayName}": พบตัวเลือก ${choices.length} ข้อ — เติม placeholder อัตโนมัติ`);
    while (choices.length < 2) {
      choices.push({ text: `ตัวเลือก ${choices.length + 1} (placeholder)`, correct: choices.length === 0 });
    }
  }
  if (!choices.some((c) => c.correct)) choices[0].correct = true;

  // Group-level attributes: shuffle (choicegroup/checkboxgroup), partial_credit (choiceresponse)
  const group = el.querySelector("choicegroup, checkboxgroup");
  const shuffle = group?.getAttribute("shuffle") === "true";
  const cr = el.querySelector("choiceresponse");
  const partialCreditRaw = cr?.getAttribute("partial_credit");
  const partialCredit = partialCreditRaw === "EDC" || partialCreditRaw === "halves" ? partialCreditRaw : undefined;

  const problemType = isDropdown ? "dropdown" : isCheckbox ? "checkbox" : "multiplechoice";
  return {
    ...common,
    problemType,
    choices,
    ...(shuffle ? { shuffle: true } : {}),
    ...(partialCredit ? { partialCredit } : {}),
  };
}
