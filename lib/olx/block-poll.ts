import type { PollBlock } from "../schema";

export function buildPollBlock(b: PollBlock, id: string): string {
  // Encode answers as JSON array of [id, {label, img, img_alt}] pairs (Open edX format)
  const answers = b.answers.map((a) => [a.id, { label: a.label, img: a.img, img_alt: "" }]);
  const lines: string[] = [
    `<poll`,
    `  url_name="${id}"`,
    `  xblock-family="xblock.v1"`,
    `  display_name="${b.displayName.replace(/"/g, "&quot;")}"`,
    `  question="${b.question.replace(/"/g, "&quot;")}"`,
    `  feedback="${b.feedback.replace(/"/g, "&quot;")}"`,
    `  max_submissions="${b.maxSubmissions}"`,
    `  private_results="${b.privateResults}"`,
    `  answers="${JSON.stringify(answers).replace(/"/g, "&quot;")}"`,
    `/>`,
  ];
  return lines.join("\n") + "\n";
}
