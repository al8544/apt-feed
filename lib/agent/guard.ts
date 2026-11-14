// "No rent or score appears that is not in a tool result" (ticket T12 done-when), as a check we can run on any answer.
// It finds dollar amounts and percentages in the model's text and reports the ones no tool result contains.
const NUMBER = /\$\s?\d[\d,]*(?:\.\d+)?k?|\d+(?:\.\d+)?\s?%/gi;
const norm = (s: string) => s.replace(/[$,\s]/g, '').toLowerCase();

export function inventedNumbers(answer: string, toolResults: string[]): string[] {
  const seen = new Set((toolResults.join(' ').match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '')));
  return (answer.match(NUMBER) ?? []).filter((raw) => {
    const n = norm(raw).replace('%', '');
    if (n.endsWith('k')) { const v = parseFloat(n) * 1000; return ![...seen].some((s) => Number(s) === v); }
    return !seen.has(n);
  });
}
