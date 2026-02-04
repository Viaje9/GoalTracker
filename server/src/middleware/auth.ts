import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../index.js';
import { hashToken } from '../utils/auth.js';

export interface AuthUser {
  id: string;
  username: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  await prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  req.user = { id: session.userId, username: session.user.username };
  req.sessionId = session.id;
  next();
}
