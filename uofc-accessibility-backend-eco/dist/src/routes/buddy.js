import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './auth.js';
import { haversine } from '../lib/geo.js';
const prisma = new PrismaClient();
const r = Router();
// All routes require authentication
r.use(verifyToken);
// Update user location
r.post('/location', async (req, res) => {
    const userId = req.userId;
    const { lat, lng } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'lat and lng required' });
    }
    await prisma.user.update({
        where: { id: userId },
        data: {
            lastLat: lat,
            lastLng: lng,
            lastSeen: new Date()
        }
    });
    return res.json({ ok: true });
});
// Get nearby users (within 500m)
r.get('/nearby', async (req, res) => {
    const userId = req.userId;
    const maxDistance = Number(req.query.distance) || 500; // meters
    // Get current user location
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastLat: true, lastLng: true }
    });
    if (!currentUser?.lastLat || !currentUser?.lastLng) {
        return res.json({ ok: true, users: [] });
    }
    // Get all users with recent locations (within last 10 minutes for easier testing)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const users = await prisma.user.findMany({
        where: {
            id: { not: userId },
            lastLat: { not: null },
            lastLng: { not: null },
            lastSeen: { gte: tenMinutesAgo }
        },
        select: {
            id: true,
            username: true,
            name: true,
            lastLat: true,
            lastLng: true,
            lastSeen: true
        }
    });
    // Filter by distance
    const nearby = users
        .filter(u => u.lastLat && u.lastLng)
        .map(u => {
        const dist = haversine([currentUser.lastLng, currentUser.lastLat], [u.lastLng, u.lastLat]);
        return { ...u, distance: Math.round(dist) };
    })
        .filter(u => u.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20); // Limit to 20 nearest
    return res.json({ ok: true, users: nearby });
});
// Send buddy walk request
r.post('/request', async (req, res) => {
    const userId = req.userId;
    const { receiverId, message } = req.body || {};
    // Parse receiverId - handle both string and number
    const receiverIdNum = typeof receiverId === 'string' ? parseInt(receiverId, 10) : Number(receiverId);
    if (!receiverId || isNaN(receiverIdNum)) {
        return res.status(400).json({ error: 'receiverId required and must be a valid number' });
    }
    if (userId === receiverIdNum) {
        return res.status(400).json({ error: 'Cannot send request to yourself' });
    }
    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
        where: { id: receiverIdNum }
    });
    if (!receiver) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Check if request already exists
    const existing = await prisma.buddyRequest.findFirst({
        where: {
            OR: [
                { senderId: userId, receiverId: receiverIdNum },
                { senderId: receiverIdNum, receiverId: userId }
            ],
            status: { in: ['pending', 'accepted'] }
        }
    });
    if (existing) {
        return res.status(400).json({ error: 'Request already exists' });
    }
    // Create request
    const request = await prisma.buddyRequest.create({
        data: {
            senderId: userId,
            receiverId: receiverIdNum,
            status: 'pending',
            message: message || null
        },
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        }
    });
    return res.json({ ok: true, request });
});
// Get buddy requests (sent and received)
r.get('/requests', async (req, res) => {
    const userId = req.userId;
    const type = req.query.type || 'all'; // 'sent', 'received', 'all'
    const where = {};
    if (type === 'sent') {
        where.senderId = userId;
    }
    else if (type === 'received') {
        where.receiverId = userId;
    }
    else {
        where.OR = [
            { senderId: userId },
            { receiverId: userId }
        ];
    }
    const requests = await prisma.buddyRequest.findMany({
        where,
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return res.json({ ok: true, requests });
});
// Accept/reject buddy request
r.post('/request/:id/respond', async (req, res) => {
    const userId = req.userId;
    const requestId = Number(req.params.id);
    const { action } = req.body || {}; // 'accept' or 'reject'
    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action must be accept or reject' });
    }
    // Find request
    const request = await prisma.buddyRequest.findUnique({
        where: { id: requestId }
    });
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    if (request.receiverId !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request already processed' });
    }
    // Update request
    const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: {
            status: action === 'accept' ? 'accepted' : 'rejected'
        },
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        }
    });
    return res.json({ ok: true, request: updated });
});
// Cancel buddy request
r.post('/request/:id/cancel', async (req, res) => {
    const userId = req.userId;
    const requestId = Number(req.params.id);
    const request = await prisma.buddyRequest.findUnique({
        where: { id: requestId }
    });
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    if (request.senderId !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Cannot cancel non-pending request' });
    }
    const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: 'cancelled' }
    });
    return res.json({ ok: true, request: updated });
});
export default r;
