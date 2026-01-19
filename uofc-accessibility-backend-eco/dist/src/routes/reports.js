import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
const prisma = new PrismaClient();
const r = Router();
r.get('/', async (_req, res) => {
    const list = await prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    res.json(list);
});
r.post('/', async (req, res) => {
    const { type, note, lat, lng, level } = req.body || {};
    if (!type || typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'type, lat, lng required' });
    }
    const created = await prisma.report.create({ data: { type, note, lat, lng, level: level ?? null } });
    res.json({ ok: true, id: created.id });
});
// Vector tile heatmap: cluster-ish by emitting points as features; client renders circles
export const heatTilesRouter = Router();
heatTilesRouter.get('/:z/:x/:y.mvt', async (req, res) => {
    const z = Number(req.params.z), x = Number(req.params.x), y = Number(req.params.y);
    const rows = await prisma.report.findMany({ take: 10000, orderBy: { createdAt: 'desc' } });
    const fc = {
        type: 'FeatureCollection',
        features: rows.map(r => ({
            type: 'Feature',
            properties: {
                type: r.type,
                count: 1
            },
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] }
        }))
    };
    const tileIndex = geojsonvt(fc, { maxZoom: 16, indexMaxZoom: 14, indexMaxPoints: 5000 });
    const tile = tileIndex.getTile(z, x, y);
    if (!tile) {
        res.setHeader('Content-Type', 'application/x-protobuf');
        return res.send(Buffer.from([]));
    }
    const buff = vtpbf.fromGeojsonVt({ heat: tile });
    res.setHeader('Content-Type', 'application/x-protobuf');
    res.send(Buffer.from(buff));
});
// Sustainability POIs subset
export const poisRouter = Router();
poisRouter.get('/', async (_req, res) => {
    const types = ['water_refill', 'recycling', 'shade_rest', 'bike_repair'];
    const rows = await prisma.report.findMany({ where: { type: { in: types } }, orderBy: { createdAt: 'desc' }, take: 5000 });
    res.json(rows);
});
export default r;
