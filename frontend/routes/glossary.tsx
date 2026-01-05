import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import GlossaryPageIsland from "../islands/GlossaryPageIsland.tsx";
import { glossaryTerms } from "../lib/glossary.ts";

export default define.page(function GlossaryPage() {
  return (
    <div class="min-h-screen" data-glossary-root>
      <Head>
        <title>Glossary - LifeOS</title>
      </Head>

      <div class="max-w-6xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Glossary</h1>
          <p class="opacity-70">
            Reference terms, definitions, pronunciations, and subject tags.
          </p>
        </div>

        <GlossaryPageIsland terms={glossaryTerms} />
      </div>
    </div>
  );
});
