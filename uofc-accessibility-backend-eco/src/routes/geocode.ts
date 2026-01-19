
import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const r = Router();

// Simple: use Mapbox if token provided; else fallback to Nominatim; also include a few campus shorthands.
const CAMPUS_PRESETS = [
  { place: 'TFDL - Taylor Family Digital Library', lat: 51.07893, lon: -114.13152 },
  { place: 'ICT - Information and Communications Tech', lat: 51.07973, lon: -114.12977 },
  { place: 'EEEL - Energy, Environment and Experiential Learning', lat: 51.07696, lon: -114.13169 },
  { place: 'MSC - MacEwan Student Centre', lat: 51.07933, lon: -114.13343 },
  { place: 'Kinesiology (KNA)', lat: 51.07597, lon: -114.13349 },
];

r.get('/', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  // quick campus shortcut match
  const lower = q.toLowerCase();
  const hits = CAMPUS_PRESETS.filter(p => p.place.toLowerCase().includes(lower));
  if (hits.length > 0) return res.json({ results: hits });

  const mapbox = process.env.MAPBOX_TOKEN || '';
  try {
    if (mapbox) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?proximity=-114.1316,51.0788&limit=5&access_token=${mapbox}`;
      const r = await fetch(url);
      const j = await r.json() as { features?: Array<{ place_name: string; center: [number, number] }> };
      const results = (j.features || []).map((f: any)=> ({
        place: f.place_name,
        lat: f.center[1],
        lon: f.center[0]
      }));
      return res.json({ results });
    } else {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
      const r = await fetch(url, { headers: { 'User-Agent': 'uofc-accessibility-app' } as any });
      const j = await r.json() as Array<{ display_name: string; lat: string; lon: string }>;
      const results = (j || []).map((f: any)=> ({
        place: f.display_name,
        lat: Number(f.lat),
        lon: Number(f.lon)
      }));
      return res.json({ results });
    }
  } catch (e){
    console.error('geocode error', e);
    return res.json({ results: hits.length > 0 ? hits : [] }); // fall back to any campus hits
  }
});

export default r;
