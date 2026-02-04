import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateToken,
  getSessionExpiry,
  hashPassword,
  hashToken,
  normalizeUsername,
  verifyPassword,
} from '../utils/auth.js';

const router = Router();

function validateCredentials(username: string, password: string): string | null {
  if (!username || !password) return 'username and password are required';
  if (username.length < 3) return 'username must be at least 3 characters';
  if (username.length > 50) return 'username is too long';
  if (password.length < 8) return 'password must be at least 8 characters';
  return null;
}

async function createSession(userId: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getSessionExpiry(),
      lastUsedAt: new Date(),
    },
  });
  return { token, sessionId: session.id };
}

router.post('/register', async (req, res) => {
  const username = normalizeUsername(String(req.body?.username || ''));
  const password = String(req.body?.password || '');

  const validationError = validateCredentials(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: 'username already exists' });
    return;
  }

  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash },
  });

  const { token } = await createSession(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username },
  });
});

router.post('/login', async (req, res) => {
  const username = normalizeUsername(String(req.body?.username || ''));
  const password = String(req.body?.password || '');

  const validationError = validateCredentials(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }

  const { token } = await createSession(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ id: req.user.id, username: req.user.username });
});

router.post('/logout', requireAuth, async (req, res) => {
  if (req.sessionId) {
    await prisma.session.delete({ where: { id: req.sessionId } }).catch(() => undefined);
  }
  res.json({ ok: true });
});

export { router as authRouter };
