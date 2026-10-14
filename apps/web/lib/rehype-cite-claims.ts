import { visit } from "unist-util-visit";

const BARRIER = "\u0000";
const WRAPPER_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "del",
  "em",
  "i",
  "ins",
  "mark",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
]);

type Properties = Record<string, unknown>;

type HastText = { type: "text"; value: string };

type HastElement = {
  type: "element";
  tagName: string;
  properties?: Properties;
  children: HastContent[];
};

type HastContent = HastElement | HastText | { type: string };

type Wrapper = { tagName: string; properties: Properties };

type Piece = {
  wrappers: Wrapper[];
} & (
  | { type: "text"; value: string }
  | { type: "atom"; node: HastElement }
);

type Positioned = Piece & { start: number; end: number };

type Marker = { index: number; start: number; end: number };

type Group = { indexes: number[]; start: number; end: number };

type Claim = {
  textStart: number;
  textEnd: number;
  groupEnd: number;
  indexes: number[];
};

type Segment =
  | { type: "plain"; start: number; end: number }
  | { type: "claim"; start: number; end: number; indexes: number[] };

function isText(node: HastContent): node is HastText {
  return node.type === "text" && "value" in node;
}

function isElement(node: HastContent): node is HastElement {
  return node.type === "element" && "tagName" in node;
}

function collect(
  nodes: HastContent[],
  wrappers: Wrapper[],
  out: Piece[],
): void {
  for (const node of nodes) {
    if (isText(node)) {
      if (node.value) {
        out.push({ type: "text", value: node.value, wrappers });
      }
      continue;
    }
    if (!isElement(node)) continue;
    if (node.tagName === "code" || node.tagName === "pre") {
      out.push({ type: "atom", node, wrappers });
      continue;
    }
    if (WRAPPER_TAGS.has(node.tagName)) {
      collect(
        node.children,
        [
          ...wrappers,
          {
            tagName: node.tagName,
            properties: { ...(node.properties ?? {}) },
          },
        ],
        out,
      );
      continue;
    }
    out.push({ type: "atom", node, wrappers });
  }
}

function position(pieces: Piece[]): { items: Positioned[]; text: string } {
  let text = "";
  const items: Positioned[] = [];
  for (const piece of pieces) {
    const start = text.length;
    text += piece.type === "text" ? piece.value : BARRIER;
    items.push({ ...piece, start, end: text.length });
  }
  return { items, text };
}

function findMarkers(items: Positioned[], sourceCount: number): Marker[] {
  const markers: Marker[] = [];
  for (const item of items) {
    if (item.type !== "text") continue;
    const pattern = /\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(item.value))) {
      const index = Number(match[1]);
      if (!Number.isInteger(index) || index < 1 || index > sourceCount) {
        continue;
      }
      markers.push({
        index,
        start: item.start + match.index,
        end: item.start + match.index + match[0].length,
      });
    }
  }
  return markers;
}

function groupMarkers(markers: Marker[], text: string): Group[] {
  const groups: Group[] = [];
  for (const marker of markers) {
    const previous = groups[groups.length - 1];
    const gap = previous ? text.slice(previous.end, marker.start) : null;
    if (previous && gap !== null && /^\s*$/.test(gap)) {
      previous.indexes.push(marker.index);
      previous.end = marker.end;
      continue;
    }
    groups.push({
      indexes: [marker.index],
      start: marker.start,
      end: marker.end,
    });
  }
  return groups;
}

function isTrimChar(char: string): boolean {
  return char !== BARRIER && /\s/.test(char);
}

// A boundary counts only when real text follows it before the citation.
// The cited sentence's own period (`blue. [1]`) does not split the claim.
function shrinkToSentence(
  text: string,
  rangeStart: number,
  groupStart: number,
): number {
  const range = text.slice(rangeStart, groupStart);
  const pattern = /[.!?] /g;
  let last = -1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(range))) {
    const after = range.slice(match.index + match[0].length);
    if (/[^\s\u0000]/.test(after)) {
      last = match.index + match[0].length;
    }
  }
  if (last === -1) return rangeStart;
  return rangeStart + last;
}

function claimsFor(groups: Group[], text: string): Claim[] {
  const multiple = groups.length > 1;
  let cursor = 0;
  return groups.map((group) => {
    let textStart = cursor;
    cursor = group.end;
    if (multiple) {
      textStart = shrinkToSentence(text, textStart, group.start);
    }
    while (textStart < group.start && isTrimChar(text[textStart] ?? "")) {
      textStart += 1;
    }
    let textEnd = group.start;
    while (textEnd > textStart && isTrimChar(text[textEnd - 1] ?? "")) {
      textEnd -= 1;
    }
    return {
      textStart,
      textEnd,
      groupEnd: group.end,
      indexes: group.indexes,
    };
  });
}

function buildSegments(claims: Claim[], length: number): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const claim of claims) {
    if (claim.textStart > cursor) {
      segments.push({ type: "plain", start: cursor, end: claim.textStart });
    }
    segments.push({
      type: "claim",
      start: claim.textStart,
      end: claim.textEnd,
      indexes: claim.indexes,
    });
    cursor = claim.groupEnd;
  }
  if (cursor < length) {
    segments.push({ type: "plain", start: cursor, end: length });
  }
  return segments;
}

function sliceRange(items: Positioned[], start: number, end: number): Piece[] {
  const pieces: Piece[] = [];
  for (const item of items) {
    if (item.end <= start || item.start >= end) continue;
    if (item.type === "atom") {
      if (item.start >= start && item.end <= end) {
        pieces.push({
          type: "atom",
          node: item.node,
          wrappers: item.wrappers,
        });
      }
      continue;
    }
    const from = Math.max(start, item.start) - item.start;
    const to = Math.min(end, item.end) - item.start;
    const value = item.value.slice(from, to);
    if (!value) continue;
    pieces.push({ type: "text", value, wrappers: item.wrappers });
  }
  return pieces;
}

function sameWrapper(left: Wrapper, right: Wrapper): boolean {
  return (
    left.tagName === right.tagName &&
    JSON.stringify(left.properties) === JSON.stringify(right.properties)
  );
}

function buildHast(pieces: Piece[]): HastContent[] {
  const nodes: HastContent[] = [];
  let index = 0;
  while (index < pieces.length) {
    const piece = pieces[index];
    if (!piece) break;
    if (piece.wrappers.length === 0) {
      if (piece.type === "atom") {
        nodes.push(piece.node);
        index += 1;
        continue;
      }
      let value = "";
      while (index < pieces.length) {
        const current = pieces[index];
        if (!current || current.type !== "text" || current.wrappers.length > 0) {
          break;
        }
        value += current.value;
        index += 1;
      }
      if (value) nodes.push({ type: "text", value });
      continue;
    }

    const wrapper = piece.wrappers[0];
    if (!wrapper) break;
    const inner: Piece[] = [];
    while (index < pieces.length) {
      const current = pieces[index];
      const currentWrapper = current?.wrappers[0];
      if (!current || !currentWrapper || !sameWrapper(currentWrapper, wrapper)) {
        break;
      }
      inner.push({ ...current, wrappers: current.wrappers.slice(1) });
      index += 1;
    }
    nodes.push({
      type: "element",
      tagName: wrapper.tagName,
      properties: wrapper.properties,
      children: buildHast(inner),
    });
  }
  return nodes;
}

function claimElement(indexes: number[], children: HastContent[]): HastElement {
  const chips: HastElement[] = indexes.map((index) => ({
    type: "element",
    tagName: "span",
    properties: { dataCiteChip: String(index) },
    children: [],
  }));
  return {
    type: "element",
    tagName: "span",
    properties: { dataCiteClaim: indexes.join(",") },
    children: [...children, ...chips],
  };
}

function transformBlock(element: HastElement, sourceCount: number): void {
  const pieces: Piece[] = [];
  collect(element.children, [], pieces);
  if (!pieces.some((piece) => piece.type === "text" && /\[\d+\]/.test(piece.value))) {
    return;
  }
  const { items, text } = position(pieces);
  const markers = findMarkers(items, sourceCount);
  if (markers.length === 0) return;

  const segments = buildSegments(claimsFor(groupMarkers(markers, text), text), text.length);
  const children: HastContent[] = [];
  for (const segment of segments) {
    const sliced = buildHast(sliceRange(items, segment.start, segment.end));
    if (segment.type === "plain") {
      children.push(...sliced);
      continue;
    }
    children.push(claimElement(segment.indexes, sliced));
  }
  element.children = children;
}

export function rehypeCiteClaims(sourceCount: number) {
  return () => (tree: Parameters<typeof visit>[0]) => {
    if (sourceCount < 1) return;
    visit(tree, "element", (node) => {
      const element = node as HastElement;
      if (
        element.tagName !== "p" &&
        element.tagName !== "li" &&
        element.tagName !== "td" &&
        element.tagName !== "th"
      ) {
        return;
      }
      transformBlock(element, sourceCount);
    });
  };
}
