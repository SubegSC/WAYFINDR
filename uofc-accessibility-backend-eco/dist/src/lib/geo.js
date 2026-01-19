export function haversine(a, b) {
    const toRad = (d) => d * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b[1] - a[1]), dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}
export function lineLength(coords) {
    let sum = 0;
    for (let i = 1; i < coords.length; i++)
        sum += haversine(coords[i - 1], coords[i]);
    return sum;
}
export function snapToGraphPoint(p, edges) {
    // Find nearest node from all edges (check all coordinates, not just endpoints)
    let best = { edge: null, dist: 1e12, coord: p, atNode: null };
    // Track all unique nodes we've seen
    const nodeCoords = new Map();
    edges.forEach(e => {
        // Store node coordinates
        if (!nodeCoords.has(e.from)) {
            nodeCoords.set(e.from, e.coords[0]);
        }
        if (!nodeCoords.has(e.to)) {
            nodeCoords.set(e.to, e.coords[e.coords.length - 1]);
        }
        // Check all coordinates along the edge for closest point
        e.coords.forEach((coord, idx) => {
            const dist = haversine(p, coord);
            if (dist < best.dist) {
                // Determine which node this coordinate belongs to
                let nodeId = null;
                if (idx === 0)
                    nodeId = e.from;
                else if (idx === e.coords.length - 1)
                    nodeId = e.to;
                else {
                    // For intermediate points, use the nearest endpoint node
                    const distToFrom = haversine(coord, e.coords[0]);
                    const distToTo = haversine(coord, e.coords[e.coords.length - 1]);
                    nodeId = distToFrom < distToTo ? e.from : e.to;
                }
                best = { edge: e, dist, coord, atNode: nodeId };
            }
        });
    });
    // If we found something within reasonable distance (500m), use it
    // Otherwise, find the nearest node from our collected nodes
    if (best.dist > 500) {
        let nearestNode = null;
        let nearestDist = 1e12;
        nodeCoords.forEach((coord, nodeId) => {
            const dist = haversine(p, coord);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestNode = nodeId;
            }
        });
        if (nearestNode !== null && nearestDist < 1000) {
            best = { edge: null, dist: nearestDist, coord: nodeCoords.get(nearestNode), atNode: nearestNode };
        }
    }
    return best;
}
