
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Outdoor-only OSM ingestion for UCalgary bounding box.
 * Produces src/data/graph.json with nodes/edges and attributes used by routing.
 */

const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

// Rough bbox around main campus
const bbox = [51.0745, -114.1360, 51.0825, -114.1260]; // [south, west, north, east]

const query = `
[out:json][timeout:60];
(
  way["highway"~"footway|path|pedestrian|living_street|cycleway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["footway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["sidewalk"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["highway"="steps"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["highway"="corridor"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["indoor"="yes"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["covered"="yes"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["tunnel"="yes"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["kerb"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["tactile_paving"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["highway"="bus_stop"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["public_transport"="platform"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["railway"="station"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["elevator"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  node["handrail"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["elevator"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["handrail"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
  way["audio:beacon"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
);
(._;>;);
out body;
`;

async function main(){
  console.log('[ingest] querying Overpass...');
  const resp = await fetch(OVERPASS, { method: 'POST', body: query, headers: { 'Content-Type':'text/plain' } as any });
  const data = await resp.json() as { elements: Array<{ type: string; id: number; [key: string]: any }> };
  const byId: Record<string, any> = {};
  for (const el of data.elements) byId[`${el.type}/${el.id}`] = el;

  // Build nodes list
  const nodes: { id:number; coord:[number,number] }[] = [];
  const nodeIdToIdx: Record<number, number> = {};
  let nid = 0;
  for (const el of data.elements){
    if (el.type === 'node'){
      nodeIdToIdx[el.id] = nid;
      nodes.push({ id: nid, coord: [el.lon, el.lat] });
      nid++;
    }
  }

  // Helpers: check if near transit, elevators, handrails
  const transitNodes = data.elements.filter((el:any)=> el.type==='node' && (el.tags?.highway==='bus_stop' || el.tags?.public_transport==='platform' || el.tags?.railway==='station'));
  const elevatorNodes = data.elements.filter((el:any)=> el.type==='node' && (el.tags?.elevator || el.tags?.['access:wheelchair']));
  const handrailNodes = data.elements.filter((el:any)=> el.type==='node' && (el.tags?.handrail || el.tags?.guardrail || el.tags?.barrier==='handrail'));

  // Build edges from ways
  const edges:any[] = [];
  let eid = 0;
  function dist(a:[number,number], b:[number,number]){
    const toRad = (d:number)=> d*Math.PI/180;
    const R=6371000;
    const dLat=toRad(b[1]-a[1]), dLon=toRad(b[0]-a[0]);
    const lat1=toRad(a[1]), lat2=toRad(b[1]);
    const s = (Math.sin(dLat/2)**2) + Math.cos(lat1)*Math.cos(lat2)*(Math.sin(dLon/2)**2);
    return 2*R*mathAsinSafe(Math.sqrt(s));
  }
  function mathAsinSafe(x:number){ return Math.asin(Math.min(1, Math.max(-1, x))); }

  for (const el of data.elements){
    if (el.type !== 'way') continue;
    const tags = el.tags || {};
    const coords = (el.nodes || []).map((id:number)=>{
      const n = byId[`node/${id}`];
      return [n.lon, n.lat] as [number,number];
    });
    if (coords.length < 2) continue;

    for (let i=1;i<coords.length;i++){
      const a = coords[i-1], b = coords[i];
      const fromId = nodeIdToIdx[el.nodes[i-1]], toId = nodeIdToIdx[el.nodes[i]];
      const mid:[number,number] = [(a[0]+b[0])/2, (a[1]+b[1])/2];
      const transitNearby = transitNodes.some((tn:any)=> dist([tn.lon, tn.lat], mid) < 50);
      const elevatorNearby = elevatorNodes.some((en:any)=> dist([en.lon, en.lat], mid) < 30);
      const handrailNearby = handrailNodes.some((hn:any)=> dist([hn.lon, hn.lat], mid) < 20);

      // Detect indoor routes: covered, tunnel, indoor tag, or corridor
      const isIndoor = tags.indoor === 'yes' || 
                       tags.covered === 'yes' || 
                       tags.tunnel === 'yes' || 
                       tags.highway === 'corridor' ||
                       tags.level !== undefined ||
                       tags.building !== undefined;

      // Detect accessibility features (from tags or nearby nodes)
      const hasElevator = tags.elevator === 'yes' || tags['access:wheelchair'] === 'yes' || elevatorNearby;
      const hasHandrail = tags.handrail === 'yes' || tags.guardrail === 'yes' || tags.barrier === 'handrail' || handrailNearby;
      const audioBeacon = tags['audio:beacon'] === 'yes' || tags['crossing:audio'] === 'yes';
      const highContrast = tags['high_contrast'] === 'yes' || tags['marking:colour'] === 'white';
      const obstacleFree = tags.obstacle_free === 'yes' || tags.clearance !== undefined;
      const consistentLighting = tags.lit === 'yes' && isIndoor; // Indoor + lit = consistent

      const e = {
        id: `e${eid++}`,
        from: fromId,
        to: toId,
        coords: [a,b],
        is_stairs: tags.highway === 'steps',
        surface: tags.surface,
        smoothness: tags.smoothness,
        lighting: tags.lit === 'yes',
        width: tags.width ? Number(tags.width) : undefined,
        min_width: tags['min_width'] ? Number(tags['min_width']) : undefined,
        footway: tags.footway,
        crossing: tags.crossing,
        transit_nearby: transitNearby,
        indoor: isIndoor,
        has_elevator: hasElevator,
        has_handrail: hasHandrail,
        audio_beacon: audioBeacon,
        high_contrast: highContrast,
        obstacle_free: obstacleFree,
        consistent_lighting: consistentLighting
      };
      edges.push(e);
    }
  }

  // Build adjacency index
  const index: Record<number, number[]> = {};
  edges.forEach((e, i)=>{
    if (!index[e.from]) index[e.from] = [];
    if (!index[e.to]) index[e.to] = [];
    index[e.from].push(i);
    index[e.to].push(i);
  });

  const out = { nodes, edges, index };
  const outPath = path.join(process.cwd(), 'src', 'data');
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(path.join(outPath, 'graph.json'), JSON.stringify(out));
  console.log('[ingest] wrote src/data/graph.json with', nodes.length, 'nodes and', edges.length, 'edges');
}

main().catch(e=>{
  console.error(e);
  process.exit(1);
});
