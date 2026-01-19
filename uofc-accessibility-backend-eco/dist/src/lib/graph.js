import fs from 'fs';
import path from 'path';
let graph = null;
export function loadGraph() {
    if (graph)
        return graph;
    const p = path.join(process.cwd(), 'src', 'data', 'graph.json');
    if (!fs.existsSync(p)) {
        console.warn('[graph] src/data/graph.json missing. Did you run `npm run ingest:overpass`?');
        // Minimal placeholder graph around TFDL to avoid hard crash.
        const nodes = [
            { id: 0, coord: [-114.1319, 51.0789] },
            { id: 1, coord: [-114.1310, 51.0787] },
            { id: 2, coord: [-114.1302, 51.0789] }
        ];
        const edges = [
            { id: 'e0', from: 0, to: 1, coords: [nodes[0].coord, nodes[1].coord] },
            { id: 'e1', from: 1, to: 2, coords: [nodes[1].coord, nodes[2].coord] }
        ];
        const g = { nodes, edges, index: { 0: [0], 1: [0, 1], 2: [1] } };
        graph = g;
        return g;
    }
    const txt = fs.readFileSync(p, 'utf-8');
    const g = JSON.parse(txt);
    // Build adjacency index if missing
    if (!g.index) {
        const idx = {};
        g.edges.forEach((e, i) => {
            if (!idx[e.from])
                idx[e.from] = [];
            if (!idx[e.to])
                idx[e.to] = [];
            idx[e.from].push(i);
            idx[e.to].push(i);
        });
        g.index = idx;
    }
    graph = g;
    return g;
}
