const STOP_WORDS = new Set([
  "a",
  "about",
  "across",
  "after",
  "all",
  "also",
  "am",
  "among",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "down",
  "each",
  "for",
  "from",
  "had",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "more",
  "most",
  "no",
  "nor",
  "not",
  "of",
  "off",
  "on",
  "only",
  "onto",
  "or",
  "other",
  "our",
  "out",
  "over",
  "per",
  "same",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "under",
  "up",
  "upon",
  "via",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "will",
  "with",
  "within",
  "without",
  "would",
  "you",
  "your",
]);

// Scaffolding that shows up beside the real terms. These never get a mark,
// and they also keep two separate ideas from being glued into one highlight.
const LOW_VALUE = new Set([
  "according",
  "achieve",
  "achieved",
  "achieves",
  "achieving",
  "additional",
  "additionally",
  "allow",
  "allowed",
  "allowing",
  "allows",
  "apply",
  "applied",
  "applies",
  "applying",
  "approach",
  "approaches",
  "appropriate",
  "associate",
  "associated",
  "associates",
  "associating",
  "assume",
  "assumed",
  "assumes",
  "assuming",
  "available",
  "base",
  "based",
  "basing",
  "become",
  "becomes",
  "becoming",
  "became",
  "calculate",
  "calculated",
  "calculates",
  "calculating",
  "call",
  "called",
  "calling",
  "calls",
  "case",
  "cases",
  "compare",
  "compared",
  "compares",
  "comparing",
  "compute",
  "computed",
  "computes",
  "computing",
  "consider",
  "considered",
  "considering",
  "considers",
  "consist",
  "consisted",
  "consisting",
  "consists",
  "contain",
  "contained",
  "containing",
  "contains",
  "contribute",
  "contributed",
  "contributes",
  "contributing",
  "correspond",
  "corresponded",
  "corresponding",
  "corresponds",
  "current",
  "define",
  "defined",
  "defines",
  "defining",
  "denote",
  "denoted",
  "denotes",
  "denoting",
  "depend",
  "depended",
  "depending",
  "depends",
  "describe",
  "described",
  "describes",
  "describing",
  "determine",
  "determined",
  "determines",
  "determining",
  "different",
  "differently",
  "discuss",
  "discussed",
  "discusses",
  "discussing",
  "dominate",
  "dominated",
  "dominates",
  "dominating",
  "enable",
  "enabled",
  "enables",
  "enabling",
  "enhance",
  "enhanced",
  "enhances",
  "enhancing",
  "ensure",
  "ensured",
  "ensures",
  "ensuring",
  "essential",
  "example",
  "examples",
  "existing",
  "facilitate",
  "facilitated",
  "facilitates",
  "facilitating",
  "feature",
  "features",
  "finally",
  "follow",
  "followed",
  "following",
  "follows",
  "furthermore",
  "generate",
  "generated",
  "generates",
  "generating",
  "give",
  "given",
  "gives",
  "giving",
  "hence",
  "however",
  "identify",
  "identified",
  "identifies",
  "identifying",
  "illustrate",
  "illustrated",
  "illustrates",
  "illustrating",
  "important",
  "improve",
  "improved",
  "improves",
  "improving",
  "include",
  "included",
  "includes",
  "including",
  "indicate",
  "indicated",
  "indicates",
  "indicating",
  "individual",
  "individually",
  "information",
  "input",
  "inputs",
  "integrate",
  "integrated",
  "integrates",
  "integrating",
  "introduce",
  "introduced",
  "introduces",
  "introducing",
  "involve",
  "involved",
  "involves",
  "involving",
  "maintain",
  "maintained",
  "maintaining",
  "maintains",
  "make",
  "makes",
  "making",
  "made",
  "map",
  "mapped",
  "mapping",
  "maps",
  "mean",
  "meaning",
  "means",
  "meant",
  "method",
  "methods",
  "moreover",
  "need",
  "needed",
  "needing",
  "needs",
  "number",
  "numbers",
  "obtain",
  "obtained",
  "obtaining",
  "obtains",
  "output",
  "outputs",
  "overall",
  "paper",
  "part",
  "particular",
  "particularly",
  "parts",
  "perform",
  "performed",
  "performing",
  "performs",
  "possible",
  "possibly",
  "present",
  "presented",
  "presenting",
  "presents",
  "preserve",
  "preserved",
  "preserves",
  "preserving",
  "prevent",
  "prevented",
  "preventing",
  "prevents",
  "process",
  "processes",
  "propose",
  "proposed",
  "proposes",
  "proposing",
  "provide",
  "provided",
  "provides",
  "providing",
  "refer",
  "referred",
  "referring",
  "refers",
  "relate",
  "related",
  "relates",
  "relating",
  "remain",
  "remained",
  "remaining",
  "remains",
  "represent",
  "represented",
  "representing",
  "represents",
  "require",
  "required",
  "requiring",
  "requires",
  "respective",
  "respectively",
  "result",
  "resulted",
  "resulting",
  "results",
  "section",
  "sections",
  "several",
  "show",
  "showed",
  "showing",
  "shown",
  "shows",
  "specific",
  "specifically",
  "study",
  "studies",
  "suggest",
  "suggested",
  "suggesting",
  "suggests",
  "support",
  "supported",
  "supporting",
  "supports",
  "take",
  "taken",
  "takes",
  "taking",
  "therefore",
  "thing",
  "things",
  "thus",
  "transform",
  "transformed",
  "transforming",
  "transforms",
  "type",
  "types",
  "use",
  "used",
  "uses",
  "using",
  "value",
  "values",
  "various",
  "way",
  "ways",
]);

const WORD = /\p{L}[\p{L}\p{N}'’′-]*/gu;
const MIN_SCORE = 2;
const MAX_PHRASES = 4;

type Token = {
  norm: string;
  start: number;
  end: number;
};

export type HighlightSpan = {
  start: number;
  end: number;
};

function fold(word: string): string {
  const lower = word.toLowerCase();
  if (lower.length < 6) return lower;
  return lower
    .replace(/isations$/, "izations")
    .replace(/isation$/, "ization")
    .replace(/ising$/, "izing")
    .replace(/ised$/, "ized")
    .replace(/ises$/, "izes")
    .replace(/ysing$/, "yzing")
    .replace(/ysed$/, "yzed");
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(WORD)) {
    if (match.index == null) continue;
    tokens.push({
      norm: fold(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function isSymbol(norm: string): boolean {
  if (/[0-9]/.test(norm) || /['’′]/.test(norm)) return true;
  if (/^[xyz](min|max)$/.test(norm)) return true;
  return norm.length >= 2 && norm.length <= 5 && !/[aeiouy]/.test(norm);
}

function termWeight(norm: string): number {
  if (STOP_WORDS.has(norm) || LOW_VALUE.has(norm)) return 0;
  if (norm.length >= 6 && norm.endsWith("ly")) return 0;
  if (isSymbol(norm)) return norm.length <= 2 ? 1.2 : 2;
  if (norm.length >= 12) return 2.2;
  if (norm.length >= 8) return 1.6;
  if (norm.length >= 5) return 1.1;
  if (norm.length >= 4) return 0.8;
  return 0;
}

function lookupKeys(norm: string): string[] {
  const keys = [norm];
  if (norm.length >= 5 && norm.endsWith("s") && !norm.endsWith("ss")) {
    keys.push(norm.slice(0, -1));
  } else if (norm.length >= 4 && !norm.endsWith("s")) {
    keys.push(`${norm}s`);
  }
  return keys;
}

function claimWeights(claim: string): Map<string, number> {
  const weights = new Map<string, number>();
  for (const token of tokenize(claim)) {
    const weight = termWeight(token.norm);
    if (weight <= 0) continue;
    for (const key of lookupKeys(token.norm)) {
      weights.set(key, Math.max(weights.get(key) ?? 0, weight));
    }
  }
  return weights;
}

function canJoin(tokens: Token[], left: number, right: number, text: string): boolean {
  if (right - left - 1 > 1) return false;
  const gap = text.slice(tokens[left].end, tokens[right].start);
  if (/[.,;:?!()[\]—–]/.test(gap)) return false;
  for (let index = left + 1; index < right; index += 1) {
    if (!STOP_WORDS.has(tokens[index].norm)) return false;
  }
  return true;
}

function rank(start: number, score: number): number {
  return score * 0.5 ** (start / 220);
}

export function highlightSpans(text: string, claim: string): HighlightSpan[] {
  if (!text || !claim) return [];
  const weights = claimWeights(claim);
  if (weights.size === 0) return [];

  const tokens = tokenize(text);
  const hits: { index: number; weight: number }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const weight = weights.get(tokens[index].norm) ?? 0;
    if (weight > 0) hits.push({ index, weight });
  }
  if (hits.length === 0) return [];

  const groups: { start: number; end: number; score: number; specific: boolean }[] = [];
  const specific = (index: number) => {
    const norm = tokens[index].norm;
    return isSymbol(norm) || norm.length >= 7;
  };
  let current = {
    from: hits[0].index,
    to: hits[0].index,
    score: hits[0].weight,
    specific: specific(hits[0].index),
  };

  for (let index = 1; index < hits.length; index += 1) {
    const hit = hits[index];
    if (canJoin(tokens, current.to, hit.index, text)) {
      current.to = hit.index;
      current.score += hit.weight;
      current.specific = current.specific || specific(hit.index);
      continue;
    }
    groups.push({
      start: tokens[current.from].start,
      end: tokens[current.to].end,
      score: current.score,
      specific: current.specific,
    });
    current = {
      from: hit.index,
      to: hit.index,
      score: hit.weight,
      specific: specific(hit.index),
    };
  }
  groups.push({
    start: tokens[current.from].start,
    end: tokens[current.to].end,
    score: current.score,
    specific: current.specific,
  });

  return groups
    .filter((group) => group.score >= MIN_SCORE && group.specific)
    .sort(
      (a, b) => rank(b.start, b.score) - rank(a.start, a.score) || a.start - b.start,
    )
    .slice(0, MAX_PHRASES)
    .sort((a, b) => a.start - b.start)
    .map((group) => ({ start: group.start, end: group.end }));
}
