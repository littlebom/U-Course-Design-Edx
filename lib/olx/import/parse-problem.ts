"use client";

// Parse a <problem> OLX file. Supports MCQ, checkbox, and dropdown (optionresponse).
export function parseProblemFile(
  el: Element,
  displayName: string,
  warnings: string[],
): object | null {
  const isCheckbox = !!el.querySelector("checkboxgroup");
  const isDropdown = !!el.querySelector("optionresponse");

  let choices: { text: string; correct: boolean }[] = [];

  if (isDropdown) {
    // Multi-part problems may have several <optionresponse> blocks — use only the first
    const firstOptInput = el.querySelector("optioninput");
    const optionEls = firstOptInput?.querySelectorAll("option") ?? [];
    choices = Array.from(optionEls).map((o) => ({
      text: o.textContent?.trim() ?? "",
      correct: o.getAttribute("correct")?.toLowerCase() === "true",
    }));
  } else {
    const choiceEls = el.querySelectorAll("choicegroup > choice, checkboxgroup > choice");
    choices = Array.from(choiceEls).map((c) => {
      const correct = c.getAttribute("correct") === "true";
      const divEl = c.querySelector("div, p");
      const text = (divEl?.textContent ?? c.textContent ?? "").trim();
      return { text, correct };
    });
  }

  if (choices.length < 2) {
    warnings.push(`Problem "${displayName}": พบตัวเลือก ${choices.length} ข้อ — เติม placeholder อัตโนมัติ`);
    while (choices.length < 2) {
      choices.push({ text: `ตัวเลือก ${choices.length + 1} (placeholder)`, correct: choices.length === 0 });
    }
  }

  // Ensure at least one correct answer
  if (!choices.some((c) => c.correct)) choices[0].correct = true;

  const qEl = el.querySelector("label") ?? el.querySelector("p") ?? el.querySelector("legend");
  const question = qEl ? `<p>${qEl.textContent?.trim()}</p>` : `<p>${displayName}</p>`;

  const solutionEl = el.querySelector("solution div, solution p");
  const explanation = solutionEl?.textContent?.trim() || undefined;

  const maxAttemptsRaw = el.getAttribute("max_attempts");
  const showAnswerRaw = el.getAttribute("showanswer");

  return {
    type: "problem" as const,
    displayName,
    problemType: isCheckbox ? "checkbox" : ("multiplechoice" as const),
    question,
    choices,
    ...(maxAttemptsRaw ? { maxAttempts: Number(maxAttemptsRaw) } : {}),
    ...(showAnswerRaw ? { showAnswer: showAnswerRaw } : {}),
    ...(explanation ? { explanation } : {}),
  };
}
