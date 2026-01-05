import { useMemo, useState } from "preact/hooks";
import type { GlossarySubject, GlossaryTerm } from "../lib/glossary.ts";

type SortMode = "alpha" | "subject";

function uniqueSubjects(terms: GlossaryTerm[]): GlossarySubject[] {
  const set = new Set<GlossarySubject>();
  for (const t of terms) for (const s of t.subjects) set.add(s);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function alphaSort(a: GlossaryTerm, b: GlossaryTerm) {
  return a.term.localeCompare(b.term);
}

export default function GlossaryPageIsland({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<GlossarySubject | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");

  const subjects = useMemo(() => uniqueSubjects(terms), [terms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms
      .filter((t) => (subject === "all" ? true : t.subjects.includes(subject)))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.term, ...(t.aliases ?? []), t.definition]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [terms, query, subject]);

  const grouped = useMemo(() => {
    if (sortMode === "alpha") {
      const sorted = [...filtered].sort(alphaSort);
      return [{ key: "All", terms: sorted }];
    }

    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      for (const s of t.subjects) {
        const list = map.get(s) ?? [];
        list.push(t);
        map.set(s, list);
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({ key, terms: list.sort(alphaSort) }));
  }, [filtered, sortMode]);

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label class="form-control">
          <span class="label-text">Search</span>
          <input
            class="input input-bordered"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            placeholder="Search terms, aliases, definitions…"
          />
        </label>

        <label class="form-control">
          <span class="label-text">Subject</span>
          <select
            class="select select-bordered"
            value={subject}
            onChange={(e) =>
              setSubject((e.currentTarget as HTMLSelectElement).value as any)}
          >
            <option value="all">All</option>
            {subjects.map((s) => <option value={s}>{s}</option>)}
          </select>
        </label>

        <label class="form-control">
          <span class="label-text">Sort</span>
          <select
            class="select select-bordered"
            value={sortMode}
            onChange={(e) =>
              setSortMode((e.currentTarget as HTMLSelectElement).value as SortMode)}
          >
            <option value="alpha">Alphabetical</option>
            <option value="subject">By subject</option>
          </select>
        </label>
      </div>

      <div class="space-y-6">
        {grouped.map((g) => (
          <section>
            {sortMode === "subject" && (
              <h2 class="text-lg font-semibold mb-3">{g.key}</h2>
            )}

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.terms.map((t) => (
                <article
                  id={t.id}
                  class="card bg-base-100 border border-base-300"
                >
                  <div class="card-body">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <h3 class="card-title text-base">
                          {t.term}
                        </h3>
                        {t.pronunciation && (
                          <div class="text-sm opacity-70">
                            Pronunciation: {t.pronunciation}
                          </div>
                        )}
                      </div>
                      <a class="link link-hover text-sm" href={`#${t.id}`}>
                        Link
                      </a>
                    </div>

                    <p class="text-sm leading-relaxed">{t.definition}</p>

                    <div class="flex flex-wrap gap-2">
                      {t.subjects.map((s) => (
                        <span class="badge badge-outline">{s}</span>
                      ))}
                    </div>

                    {(t.aliases?.length ?? 0) > 0 && (
                      <div class="text-xs opacity-70">
                        Aliases: {t.aliases?.join(", ")}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <div class="alert">
            <span>No glossary entries matched your filters.</span>
          </div>
        )}
      </div>
    </div>
  );
}
