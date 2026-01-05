import { useEffect } from "preact/hooks";
import type { GlossaryTerm } from "../lib/glossary.ts";
import { getAllGlossaryPhrases, normalizeForMatch } from "../lib/glossary.ts";

interface Props {
  terms: GlossaryTerm[];
  /** CSS selector for the container to scan */
  rootSelector?: string;
}

type PhraseIndexEntry = {
  phrase: string;
  phraseNormalized: string;
  termId: string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shouldSkipElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === "a" || tag === "code" || tag === "pre" || tag === "script" ||
    tag === "style";
}

export default function GlossaryAutoLinker(
  { terms, rootSelector = "[data-glossary-root]" }: Props,
) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const phraseIndex: PhraseIndexEntry[] = terms.flatMap((t) =>
      getAllGlossaryPhrases(t).map((phrase) => ({
        phrase,
        phraseNormalized: normalizeForMatch(phrase),
        termId: t.id,
      }))
    );

    // Prefer longer phrases first to reduce partial matches.
    phraseIndex.sort((a, b) => b.phrase.length - a.phrase.length);

    const patterns = phraseIndex
      .map((p) => escapeRegExp(p.phrase))
      .filter(Boolean);

    if (patterns.length === 0) return;

    // Use word boundaries to avoid mid-word matches.
    const re = new RegExp(`\\b(${patterns.join("|")})\\b`, "gi");

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
          if (parent.closest("a,code,pre,script,style")) {
            return NodeFilter.FILTER_REJECT;
          }
          const txt = node.nodeValue ?? "";
          if (!txt.trim()) return NodeFilter.FILTER_REJECT;
          if (!re.test(txt)) return NodeFilter.FILTER_REJECT;
          re.lastIndex = 0;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const toProcess: Text[] = [];
    while (walker.nextNode()) {
      toProcess.push(walker.currentNode as Text);
    }

    for (const textNode of toProcess) {
      const original = textNode.nodeValue ?? "";
      if (!original.trim()) continue;

      const frag = document.createDocumentFragment();
      let lastIndex = 0;

      original.replace(re, (match: string, _g1: string, offset: number) => {
        // Append text before match
        if (offset > lastIndex) {
          frag.appendChild(document.createTextNode(original.slice(lastIndex, offset)));
        }

        const matchNorm = normalizeForMatch(match);
        const entry = phraseIndex.find((p) => p.phraseNormalized === matchNorm) ??
          phraseIndex.find((p) =>
            normalizeForMatch(p.phrase) === matchNorm
          );

        if (!entry) {
          frag.appendChild(document.createTextNode(match));
          lastIndex = offset + match.length;
          return match;
        }

        const a = document.createElement("a");
        a.href = `/glossary#${entry.termId}`;
        a.className = "link link-primary";
        a.textContent = match;
        a.setAttribute("data-glossary-term", entry.termId);
        frag.appendChild(a);

        lastIndex = offset + match.length;
        return match;
      });

      // Append remaining text
      if (lastIndex < original.length) {
        frag.appendChild(document.createTextNode(original.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      if (parent) parent.replaceChild(frag, textNode);
    }
  }, [terms, rootSelector]);

  return null;
}
