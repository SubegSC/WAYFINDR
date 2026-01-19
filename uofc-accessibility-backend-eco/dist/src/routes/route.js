import { Router } from 'express';
import { loadGraph } from '../lib/graph.js';
import { lineLength, haversine, snapToGraphPoint } from '../lib/geo.js';
const r = Router();
function wxStub() { return {}; } // plug in OpenWeather flags if you wish
function isRough(e) {
    const s = String(e.surface || '').toLowerCase();
    const sm = String(e.smoothness || '').toLowerCase();
    return ['gravel', 'cobblestone', 'unpaved'].includes(s) || ['bad', 'very_bad', 'horrible'].includes(sm);
}
function isGreenEdge(e) {
    const hw = e.highway || '';
    const foot = e.footway || '';
    return ['path', 'footway', 'pedestrian'].includes(hw) || foot === 'sidewalk';
}
function len(coords) { return lineLength(coords); }
function analyzeEdgeReasons(e, profile, wx) {
    const reasons = [];
    if (profile === 'eco') {
        if (e.indoor === false) {
            reasons.push({ factor: 'outdoor', impact: 'positive', description: 'Outdoor route (enjoy nature)' });
        }
        else if (e.indoor === true) {
            reasons.push({ factor: 'indoor', impact: 'negative', description: 'Indoor route (prefer outdoor)' });
        }
        if (isGreenEdge(e)) {
            reasons.push({ factor: 'green_path', impact: 'positive', description: 'Green path (footway/pedestrian)' });
        }
        const surface = String(e.surface || '').toLowerCase();
        if (['grass', 'dirt', 'earth', 'ground'].includes(surface)) {
            reasons.push({ factor: 'natural_surface', impact: 'positive', description: `Natural surface (${surface})` });
        }
        if (e.transit_nearby) {
            reasons.push({ factor: 'transit_nearby', impact: 'positive', description: 'Transit nearby (eco-friendly)' });
        }
    }
    if (profile === 'wheelchair') {
        if (e.indoor === true) {
            reasons.push({ factor: 'indoor', impact: 'positive', description: 'Indoor route (protected from weather)' });
        }
        else if (e.indoor === false) {
            reasons.push({ factor: 'outdoor', impact: 'negative', description: 'Outdoor route (exposed to weather)' });
        }
        const width = e.width || e.min_width || 0;
        if (width >= 1.5) {
            reasons.push({ factor: 'wide_path', impact: 'positive', description: `Wide path (${width.toFixed(1)}m)` });
        }
        else if (width > 0 && width < 1.0) {
            reasons.push({ factor: 'narrow_path', impact: 'negative', description: `Narrow path (${width.toFixed(1)}m)` });
        }
        const smoothness = String(e.smoothness || '').toLowerCase();
        if (['excellent', 'good'].includes(smoothness)) {
            reasons.push({ factor: 'smooth_surface', impact: 'positive', description: `Smooth surface (${smoothness})` });
        }
        else if (['bad', 'very_bad', 'horrible'].includes(smoothness)) {
            reasons.push({ factor: 'rough_surface', impact: 'negative', description: `Rough surface (${smoothness})` });
        }
        const slope = e.incline_pct || 0;
        if (slope > 8) {
            reasons.push({ factor: 'steep_slope', impact: 'negative', description: `Very steep slope (${slope.toFixed(1)}%)` });
        }
        else if (slope > 5) {
            reasons.push({ factor: 'moderate_slope', impact: 'negative', description: `Moderate slope (${slope.toFixed(1)}%)` });
        }
        else if (slope > 0 && slope <= 3) {
            reasons.push({ factor: 'gentle_slope', impact: 'positive', description: `Gentle slope (${slope.toFixed(1)}%)` });
        }
        if (e.has_elevator) {
            reasons.push({ factor: 'elevator', impact: 'positive', description: 'Elevator access available' });
        }
        if (e.has_handrail) {
            reasons.push({ factor: 'handrail', impact: 'positive', description: 'Handrail present' });
        }
        if (e.obstacle_free) {
            reasons.push({ factor: 'obstacle_free', impact: 'positive', description: 'Clear, obstacle-free path' });
        }
        if (e.has_curb_ramp) {
            reasons.push({ factor: 'curb_ramp', impact: 'positive', description: 'Curb ramp available' });
        }
    }
    if (profile === 'visually_impaired') {
        if (e.indoor === true) {
            reasons.push({ factor: 'indoor', impact: 'positive', description: 'Indoor route (protected environment)' });
        }
        else if (e.indoor === false) {
            reasons.push({ factor: 'outdoor', impact: 'negative', description: 'Outdoor route (less predictable)' });
        }
        if (e.consistent_lighting === true) {
            reasons.push({ factor: 'consistent_lighting', impact: 'positive', description: 'Consistent, well-lit indoor area' });
        }
        else if (e.lighting === true) {
            reasons.push({ factor: 'well_lit', impact: 'positive', description: 'Well-lit path' });
        }
        else if (e.lighting === false || wx.lowVis) {
            reasons.push({ factor: 'poor_lighting', impact: 'negative', description: 'Poorly lit or low visibility' });
        }
        if (e.audio_beacon) {
            reasons.push({ factor: 'audio_beacon', impact: 'positive', description: 'Audio beacon/signal available' });
        }
        if (e.high_contrast) {
            reasons.push({ factor: 'high_contrast', impact: 'positive', description: 'High contrast markings' });
        }
        if (e.tactile_paving) {
            reasons.push({ factor: 'tactile_paving', impact: 'positive', description: 'Tactile paving for guidance' });
        }
        if (e.has_handrail) {
            reasons.push({ factor: 'handrail', impact: 'positive', description: 'Handrail for guidance' });
        }
        if (e.obstacle_free) {
            reasons.push({ factor: 'obstacle_free', impact: 'positive', description: 'Clear, obstacle-free path' });
        }
        const turnC = (e.turn_complexity || 0);
        if (turnC > 3) {
            reasons.push({ factor: 'complex_intersection', impact: 'negative', description: 'Very complex intersection' });
        }
        else if (turnC > 1) {
            reasons.push({ factor: 'moderate_complexity', impact: 'negative', description: 'Moderate turn complexity' });
        }
        if (['traffic_signals', 'zebra'].includes(String(e.crossing))) {
            reasons.push({ factor: 'marked_crossing', impact: 'positive', description: 'Marked crossing (safer)' });
        }
    }
    return reasons;
}
function costEdge(e, profile, wx) {
    if (e.__closed)
        return Infinity;
    let c = e.length ?? len(e.coords);
    // Default: shortest path, no restrictions
    if (profile === 'default') {
        return c; // Just return base cost, no modifications
    }
    if (profile === 'wheelchair') {
        if (e.is_stairs)
            return Infinity;
        // Strongly prefer indoor routes - make outdoor routes much more expensive
        if (e.indoor === true) {
            c *= 0.3; // Indoor routes are much cheaper (preferred)
        }
        else {
            c *= 2.5; // Outdoor routes are penalized heavily
        }
        // Width requirements - prefer wider paths
        const width = e.width || e.min_width || 0;
        if (width >= 1.5) {
            c *= 0.9; // Wide paths (1.5m+) are preferred
        }
        else if (width > 0 && width < 1.0) {
            c *= 1.4; // Narrow paths (<1m) are penalized
        }
        // Surface quality - stricter requirements
        const smoothness = String(e.smoothness || '').toLowerCase();
        if (['excellent', 'good'].includes(smoothness)) {
            c *= 0.9; // Excellent/good surfaces preferred
        }
        else if (['bad', 'very_bad', 'horrible'].includes(smoothness)) {
            c *= 1.5; // Bad surfaces heavily penalized
        }
        // Slope handling
        const slope = e.incline_pct || 0;
        if (slope > 8)
            c *= 2.0; // Very steep slopes heavily penalized
        else if (slope > 5)
            c *= 1.5; // Moderate slopes penalized
        else if (slope > 0 && slope <= 3)
            c *= 0.95; // Gentle slopes slightly preferred
        if (wx.icy && slope > 3)
            c *= 1.6;
        // Accessibility features
        if (isRough(e))
            c *= 1.25;
        if (e.has_curb_ramp)
            c *= 0.85;
        if (e.has_elevator)
            c *= 0.8; // Elevator access greatly preferred
        if (e.has_handrail)
            c *= 0.9; // Handrails provide safety
        if (e.obstacle_free)
            c *= 0.9; // Clear paths preferred
        return c;
    }
    if (profile === 'visually_impaired') {
        // Avoid stairs completely
        if (e.is_stairs)
            return Infinity;
        // Strongly prefer indoor routes
        if (e.indoor === true) {
            c *= 0.4; // Indoor routes are preferred
        }
        else {
            c *= 2.0; // Outdoor routes are penalized
        }
        // Lighting - prefer consistent, well-lit areas
        if (e.consistent_lighting === true) {
            c *= 0.6; // Consistent lighting is highly preferred
        }
        else if (e.lighting === true) {
            c *= 0.7; // Well-lit routes are much better
        }
        else if (e.lighting === false || wx.lowVis) {
            c *= 2.0; // Poorly lit routes are heavily penalized
        }
        // Navigation aids
        if (e.audio_beacon)
            c *= 0.75; // Audio beacons greatly help navigation
        if (e.high_contrast)
            c *= 0.85; // High contrast markings help visibility
        if (e.tactile_paving)
            c *= 0.9; // Tactile paving is very helpful
        if (e.has_handrail)
            c *= 0.9; // Handrails provide guidance
        if (e.obstacle_free)
            c *= 0.85; // Clear paths are much safer
        // Crossing safety
        if (['traffic_signals', 'zebra'].includes(String(e.crossing))) {
            c *= 0.85; // Marked crossings are safer
        }
        // Turn complexity - avoid complex intersections
        const turnC = (e.turn_complexity || 0);
        if (turnC > 3)
            c *= 1.3; // Very complex turns heavily penalized
        else if (turnC > 1)
            c *= 1.1; // Moderate complexity penalized
        else
            c *= 1 + 0.03 * turnC; // Simple turns slightly penalized
        return c;
    }
    if (profile === 'eco') {
        // Prefer outdoor routes - heavily penalize indoor routes (toll on indoor paths)
        if (e.indoor === true) {
            c *= 3.5; // Heavy toll on indoor routes - prefer outdoor even if much longer
        }
        else {
            c *= 0.5; // Outdoor routes are strongly preferred
        }
        // Strongly prefer green paths (footways, paths, pedestrian areas)
        if (isGreenEdge(e)) {
            c *= 0.7; // Green paths are much preferred
        }
        // Prefer natural surfaces
        const surface = String(e.surface || '').toLowerCase();
        if (['grass', 'dirt', 'earth', 'ground'].includes(surface)) {
            c *= 0.85; // Natural surfaces preferred
        }
        else if (['asphalt', 'concrete'].includes(surface)) {
            c *= 1.1; // Paved surfaces slightly penalized
        }
        // Prefer routes near transit (eco-friendly transportation)
        if (e.transit_nearby) {
            c *= 0.9; // Transit nearby is good
        }
        // Avoid very rough surfaces but allow some natural roughness
        if (isRough(e)) {
            const smoothness = String(e.smoothness || '').toLowerCase();
            if (['very_bad', 'horrible'].includes(smoothness)) {
                c *= 1.2; // Only penalize very bad surfaces
            }
        }
        // Gentle slopes are fine, avoid very steep ones
        const slope = e.incline_pct || 0;
        if (slope > 10) {
            c *= 1.3; // Very steep slopes penalized
        }
        else if (slope > 0 && slope <= 5) {
            c *= 0.95; // Gentle slopes slightly preferred
        }
        // Prefer wider paths for comfort
        const width = e.width || 0;
        if (width >= 2.0) {
            c *= 0.9; // Wide paths preferred
        }
        return c;
    }
    return c;
}
function heuristic(a, b) { return haversine(a, b); }
function aStar(g, startCoord, endCoord, profile) {
    const wx = wxStub();
    // Snap start/end to nearest nodes
    const es = snapToGraphPoint(startCoord, g.edges);
    const ee = snapToGraphPoint(endCoord, g.edges);
    // Validate snapping results
    if (es.atNode === null || es.dist > 1000) {
        console.warn(`[route] Could not snap start point (distance: ${es.dist.toFixed(0)}m)`);
        return { ok: false, error: 'start_point_too_far', reasoning: null };
    }
    if (ee.atNode === null || ee.dist > 1000) {
        console.warn(`[route] Could not snap end point (distance: ${ee.dist.toFixed(0)}m)`);
        return { ok: false, error: 'end_point_too_far', reasoning: null };
    }
    const startNode = es.atNode;
    const endNode = ee.atNode;
    // Check if start and end are the same
    if (startNode === endNode) {
        return { ok: false, error: 'same_start_end', reasoning: null };
    }
    const getCoordOfNode = (id) => g.nodes.find(n => n.id === id)?.coord;
    const open = new Set([startNode]);
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(startNode, 0);
    const fScore = new Map();
    fScore.set(startNode, heuristic(getCoordOfNode(startNode), getCoordOfNode(endNode)));
    function lowestF() {
        let best = null;
        let bestScore = Infinity;
        for (const n of open) {
            const s = fScore.get(n) ?? Infinity;
            if (s < bestScore) {
                bestScore = s;
                best = n;
            }
        }
        return best;
    }
    const index = g.index || {};
    // Validate that start node has neighbors
    if (!index[startNode] || index[startNode].length === 0) {
        console.warn(`[route] Start node ${startNode} has no neighbors`);
        return { ok: false, error: 'start_node_disconnected', reasoning: null };
    }
    // Validate that end node has neighbors
    if (!index[endNode] || index[endNode].length === 0) {
        console.warn(`[route] End node ${endNode} has no neighbors`);
        return { ok: false, error: 'end_node_disconnected', reasoning: null };
    }
    let iterations = 0;
    const maxIterations = 10000; // Prevent infinite loops
    while (open.size && iterations < maxIterations) {
        iterations++;
        const current = lowestF();
        if (current === null)
            break;
        if (current === endNode) {
            // reconstruct path and track edges used
            const pathNodes = [current];
            const pathEdges = [];
            let prevNode = current;
            while (cameFrom.has(pathNodes[0])) {
                const fromNode = cameFrom.get(pathNodes[0]);
                // Find edge connecting fromNode to prevNode
                const edgeIdx = (index[fromNode] || []).find(ei => {
                    const edge = g.edges[ei];
                    return (edge.from === fromNode && edge.to === prevNode) || (edge.to === fromNode && edge.from === prevNode);
                });
                if (edgeIdx !== undefined)
                    pathEdges.unshift(edgeIdx);
                pathNodes.unshift(fromNode);
                prevNode = fromNode;
            }
            // Analyze why this path was chosen
            const pathReasons = [];
            const reasonCounts = {};
            pathEdges.forEach(ei => {
                const edge = g.edges[ei];
                const reasons = analyzeEdgeReasons(edge, profile, wx);
                reasons.forEach(r => {
                    if (!reasonCounts[r.factor]) {
                        reasonCounts[r.factor] = { count: 0, impact: r.impact };
                    }
                    reasonCounts[r.factor].count++;
                });
            });
            // Convert to summary - get descriptions from any edge that has the factor
            const summary = [];
            const positives = [];
            const negatives = [];
            // Build factor descriptions map
            const factorDescriptions = {};
            pathEdges.forEach(ei => {
                const edge = g.edges[ei];
                const reasons = analyzeEdgeReasons(edge, profile, wx);
                reasons.forEach(r => {
                    if (!factorDescriptions[r.factor]) {
                        factorDescriptions[r.factor] = r.description;
                    }
                });
            });
            Object.entries(reasonCounts).forEach(([factor, data]) => {
                const desc = factorDescriptions[factor] || factor;
                if (data.impact === 'positive') {
                    positives.push(`${desc} (${data.count} segments)`);
                }
                else if (data.impact === 'negative') {
                    negatives.push(`${desc} (${data.count} segments)`);
                }
            });
            if (positives.length > 0) {
                summary.push(`✓ Benefits: ${positives.slice(0, 5).join(', ')}`);
            }
            if (negatives.length > 0) {
                summary.push(`⚠ Challenges: ${negatives.slice(0, 3).join(', ')}`);
            }
            // convert nodes to edge coordinates
            const coords = pathNodes.map(id => getCoordOfNode(id));
            return {
                ok: true,
                coords,
                length: coordsLength(coords),
                reasoning: {
                    summary: summary.join(' | '),
                    factors: reasonCounts,
                    positiveCount: positives.length,
                    negativeCount: negatives.length
                }
            };
        }
        open.delete(current);
        const neighborEdgeIdx = index[current] || [];
        for (const ei of neighborEdgeIdx) {
            const e = g.edges[ei];
            const neighbor = (e.from === current) ? e.to : e.from;
            const tentative = (gScore.get(current) ?? Infinity) + costEdge(e, profile, wx);
            if (tentative < (gScore.get(neighbor) ?? Infinity)) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, tentative);
                fScore.set(neighbor, tentative + heuristic(getCoordOfNode(neighbor), getCoordOfNode(endNode)));
                open.add(neighbor);
            }
        }
    }
    if (iterations >= maxIterations) {
        console.warn(`[route] Pathfinding exceeded max iterations`);
    }
    return { ok: false, error: 'no_path', reasoning: null };
}
function coordsLength(coords) {
    let d = 0;
    for (let i = 1; i < coords.length; i++) {
        d += haversine(coords[i - 1], coords[i]);
    }
    return d;
}
r.post('/', async (req, res) => {
    const { start, end, profile } = req.body || {};
    if (!start || !end)
        return res.status(400).json({ error: 'start/end required' });
    // Map frontend profile names to backend profile names
    let p = 'default';
    if (profile === 'visually_impaired') {
        p = 'visually_impaired';
    }
    else if (profile === 'wheelchair') {
        p = 'wheelchair';
    }
    else if (profile === 'eco') {
        p = 'eco';
    }
    else if (profile === 'default') {
        p = 'default';
    }
    const g = loadGraph();
    const result = aStar(g, start, end, p);
    return res.json(result);
});
export default r;
