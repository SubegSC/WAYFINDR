import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper to generate JWT token
function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware to verify JWT token
export function verifyToken(req: Request, res: Response, next: () => void) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Signup
r.post('/signup', async (req: Request, res: Response) => {
  const { email, username, password, name } = req.body || {};
  
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username, and password required' });
  }
  
  // Check if user exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  
  if (existing) {
    return res.status(400).json({ error: 'Email or username already exists' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name: name || null
    },
    select: { id: true, email: true, username: true, name: true, createdAt: true }
  });
  
  const token = generateToken(user.id);
  
  return res.json({ ok: true, user, token });
});

// Login
r.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user.id);
  
  return res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt
    },
    token
  });
});

// Get current user
r.get('/me', verifyToken, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true, createdAt: true, lastLat: true, lastLng: true, lastSeen: true }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  return res.json({ ok: true, user });
});

export default r;

