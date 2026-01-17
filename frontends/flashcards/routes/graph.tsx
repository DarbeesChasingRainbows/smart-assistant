import { define, url } from "../utils.ts";
import { CrossReference, Deck, RetentionApiClient } from "../utils/api.ts";

const client = new RetentionApiClient();

export default define.page(async (_ctx) => {
  const decks = await client.getDecks();
  const allRefs: (CrossReference & { sourceDeck: Deck })[] = [];

  // Fetch all cross-references for the graph
  for (const deck of decks) {
    const refs = await client.getCrossReferences(deck.id);
    allRefs.push(
      ...refs.map((ref: CrossReference) => ({ ...ref, sourceDeck: deck })),
    );
  }

  // Transform data for vis-network
  const nodes = decks.map((deck: Deck) => ({
    id: deck.id,
    label: deck.name,
    title: `${deck.category} / ${deck.subcategory}\n${deck.cardCount} cards`,
    group: deck.category,
    value: Math.max(10, Math.min(30, deck.cardCount / 10)), // Size based on card count
  }));

  const edges = allRefs.map((ref: CrossReference) => ({
    from: ref.sourceId,
    to: ref.targetId,
    title: ref.referenceType,
    arrows: "to",
    color: {
      color: getEdgeColor(ref.referenceType),
      highlight: getEdgeColor(ref.referenceType),
    },
  }));

  function getEdgeColor(type: string): string {
    const colors = {
      "Related": "#97C2FC",
      "Prerequisite": "#FB7E81",
      "FollowsFrom": "#C2FABC",
      "Contradicts": "#FFA807",
      "ExampleOf": "#DEB887",
    };
    return colors[type as keyof typeof colors] || "#CCCCCC";
  }

  return (
    <div class="min-h-screen bg-gray-50 p-4">
      <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">
            Deck Relationship Graph
          </h1>
          <div class="flex gap-2">
            <a href={url("/decks")} class="btn btn-ghost">Back to Decks</a>
            <a href={url("/")} class="btn btn-primary">Quiz</a>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="mb-4">
              <p class="text-sm text-gray-600">
                Visualizing {decks.length} decks with {allRefs.length}{" "}
                relationships. Node sizes represent card counts. Edge colors
                indicate relationship types.
              </p>
            </div>

            {/* Graph container */}
            <div
              id="network-graph"
              style="width: 100%; height: 600px; border: 1px solid #ddd;"
            >
            </div>

            {/* Legend */}
            <div class="mt-4 flex flex-wrap gap-4 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-blue-400"></div>
                <span>Related</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-red-400"></div>
                <span>Prerequisite</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-green-400"></div>
                <span>Follows From</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-yellow-400"></div>
                <span>Contradicts</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-amber-200"></div>
                <span>Example Of</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load vis-network scripts */}
      <script src="https://unpkg.com/vis-data@latest/peer/umd/vis-data.min.js">
      </script>
      <script src="https://unpkg.com/vis-network@latest/peer/umd/vis-network.min.js">
      </script>
      <link
        rel="stylesheet"
        href="https://unpkg.com/vis-network/styles/vis-network.min.css"
      />

      <script>
        {`
          // Initialize network after page loads
          document.addEventListener('DOMContentLoaded', function() {
            const nodes = new vis.DataSet(${JSON.stringify(nodes)});
            const edges = new vis.DataSet(${JSON.stringify(edges)});
            
            const container = document.getElementById('network-graph');
            if (!container) return;
            
            const data = { nodes: nodes, edges: edges };
            
            const options = {
              nodes: {
                shape: 'dot',
                scaling: {
                  min: 10,
                  max: 30
                },
                font: {
                  size: 12,
                  face: 'Tahoma'
                },
                borderWidth: 2
              },
              edges: {
                width: 2,
                smooth: {
                  type: 'continuous'
                }
              },
              physics: {
                stabilization: {
                  iterations: 200
                },
                barnesHut: {
                  gravitationalConstant: -30000,
                  centralGravity: 0.3,
                  springLength: 120,
                  springConstant: 0.04,
                  damping: 0.09
                }
              },
              groups: {
                '02-Sciences': { color: '#3B82F6' },
                '01-Healthcare': { color: '#10B981' },
                '03-Technology': { color: '#F59E0B' },
                '04-Business': { color: '#EF4444' },
                '05-Arts': { color: '#8B5CF6' },
                'default': { color: '#6B7280' }
              }
            };
            
            const network = new vis.Network(container, data, options);
            
            // Handle node clicks
            network.on('click', function(params) {
              if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                window.location.href = '/decks/' + nodeId;
              }
            });
          });
        `}
      </script>
    </div>
  );
});
