import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from './auth.js';
const prisma = new PrismaClient();
const r = Router();
// All routes require authentication
r.use(verifyToken);
// Get all conversations (users you've exchanged messages with or have accepted requests)
r.get('/conversations', async (req, res) => {
    const userId = req.userId;
    // Get accepted buddy requests
    const acceptedRequests = await prisma.buddyRequest.findMany({
        where: {
            OR: [
                { senderId: userId, status: 'accepted' },
                { receiverId: userId, status: 'accepted' }
            ]
        },
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        }
    });
    // Get unique conversation partners
    const partners = new Map();
    acceptedRequests.forEach(req => {
        const partnerId = req.senderId === userId ? req.receiverId : req.senderId;
        const partner = req.senderId === userId ? req.receiver : req.sender;
        if (!partners.has(partnerId)) {
            partners.set(partnerId, {
                id: partner.id,
                username: partner.username,
                name: partner.name,
                lastMessage: null,
                unreadCount: 0
            });
        }
    });
    // Get last message and unread count for each conversation
    for (const [partnerId, partner] of partners.entries()) {
        const lastMessage = await prisma.message.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: partnerId },
                    { senderId: partnerId, receiverId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        const unreadCount = await prisma.message.count({
            where: {
                senderId: partnerId,
                receiverId: userId,
                read: false
            }
        });
        partner.lastMessage = lastMessage;
        partner.unreadCount = unreadCount;
    }
    const conversations = Array.from(partners.values())
        .sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage)
            return 0;
        if (!a.lastMessage)
            return 1;
        if (!b.lastMessage)
            return -1;
        return b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();
    });
    return res.json({ ok: true, conversations });
});
// Get messages with a specific user
r.get('/:userId', async (req, res) => {
    const currentUserId = req.userId;
    const otherUserId = Number(req.params.userId);
    if (isNaN(otherUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    // Check if they have an accepted buddy request
    const buddyRequest = await prisma.buddyRequest.findFirst({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: otherUserId, status: 'accepted' },
                { senderId: otherUserId, receiverId: currentUserId, status: 'accepted' }
            ]
        }
    });
    if (!buddyRequest) {
        return res.status(403).json({ error: 'You can only message accepted buddies' });
    }
    // Get messages
    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId }
            ]
        },
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        },
        orderBy: { createdAt: 'asc' },
        take: 100 // Limit to last 100 messages
    });
    // Mark messages as read
    await prisma.message.updateMany({
        where: {
            senderId: otherUserId,
            receiverId: currentUserId,
            read: false
        },
        data: { read: true }
    });
    return res.json({ ok: true, messages });
});
// Send a message
r.post('/:userId', async (req, res) => {
    const currentUserId = req.userId;
    const otherUserId = Number(req.params.userId);
    const { content } = req.body || {};
    if (isNaN(otherUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content required' });
    }
    if (content.length > 1000) {
        return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
    }
    // Check if they have an accepted buddy request
    const buddyRequest = await prisma.buddyRequest.findFirst({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: otherUserId, status: 'accepted' },
                { senderId: otherUserId, receiverId: currentUserId, status: 'accepted' }
            ]
        }
    });
    if (!buddyRequest) {
        return res.status(403).json({ error: 'You can only message accepted buddies' });
    }
    // Create message
    const message = await prisma.message.create({
        data: {
            senderId: currentUserId,
            receiverId: otherUserId,
            content: content.trim()
        },
        include: {
            sender: { select: { id: true, username: true, name: true } },
            receiver: { select: { id: true, username: true, name: true } }
        }
    });
    return res.json({ ok: true, message });
});
// Get unread message count
r.get('/unread/count', async (req, res) => {
    const userId = req.userId;
    const count = await prisma.message.count({
        where: {
            receiverId: userId,
            read: false
        }
    });
    return res.json({ ok: true, count });
});
export default r;
