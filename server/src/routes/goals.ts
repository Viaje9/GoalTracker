import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import type { SubItem as SubItemType } from '@prisma/client';

const router = Router();

/* ─── Helper: build nested sub-item tree from flat list ─── */

interface SubItemTree {
  id: string;
  text: string;
  type: string;
  checked: boolean;
  subs: SubItemTree[];
}

function buildSubTree(flatSubs: SubItemType[], parentId: string | null): SubItemTree[] {
  return flatSubs
    .filter(s => s.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(s => ({
      id: s.id,
      text: s.text,
      type: s.type,
      checked: s.checked,
      subs: buildSubTree(flatSubs, s.id),
    }));
}

function getUserId(req: Request, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/* ─── GET /api/goals?weekKey=YYYY-MM-DD ─── */

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const weekKey = req.query.weekKey as string;
  if (!weekKey) {
    res.status(400).json({ error: 'weekKey is required' });
    return;
  }

  const goals = await prisma.goal.findMany({
    where: { weekKey, userId },
    include: { subs: true },
    orderBy: { order: 'asc' },
  });

  const result = goals.map(g => ({
    id: g.id,
    text: g.text,
    checked: g.checked,
    subs: buildSubTree(g.subs, null),
  }));

  res.json(result);
});

/* ─── POST /api/goals ─── */

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { text, weekKey } = req.body;
  if (!text || !weekKey) {
    res.status(400).json({ error: 'text and weekKey are required' });
    return;
  }

  const count = await prisma.goal.count({ where: { weekKey, userId } });

  const goal = await prisma.goal.create({
    data: { text, weekKey, order: count, userId },
    include: { subs: true },
  });

  res.status(201).json({
    id: goal.id,
    text: goal.text,
    checked: goal.checked,
    subs: [],
  });
});

/* ─── PATCH /api/goals/:id ─── */

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const id = req.params.id as string;
  const { text, checked } = req.body;

  const data: Record<string, unknown> = {};
  if (text !== undefined) data.text = text;
  if (checked !== undefined) data.checked = checked;

  const existing = await prisma.goal.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  const goal = await prisma.goal.update({ where: { id }, data });

  res.json({ id: goal.id, text: goal.text, checked: goal.checked });
});

/* ─── DELETE /api/goals/:id ─── */

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const id = req.params.id as string;
  const result = await prisma.goal.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }
  res.json({ ok: true });
});

/* ─── POST /api/goals/:goalId/subs ─── */

router.post('/:goalId/subs', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const goalId = req.params.goalId as string;
  const { text, type, parentSubId } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  if (parentSubId) {
    const parent = await prisma.subItem.findFirst({
      where: { id: parentSubId, goalId },
    });
    if (!parent) {
      res.status(404).json({ error: 'Parent sub-item not found' });
      return;
    }
  }

  // Count siblings for order
  const siblingCount = parentSubId
    ? await prisma.subItem.count({ where: { parentId: parentSubId } })
    : await prisma.subItem.count({ where: { goalId, parentId: null } });

  const sub = await prisma.subItem.create({
    data: {
      text,
      type: type || 'checkbox',
      goalId,
      parentId: parentSubId || null,
      order: siblingCount,
    },
  });

  res.status(201).json({
    id: sub.id,
    text: sub.text,
    type: sub.type,
    checked: sub.checked,
    subs: [],
  });
});

/* ─── PATCH /api/goals/subs/:id ─── */

router.patch('/subs/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const id = req.params.id as string;
  const { text, checked } = req.body;

  const data: Record<string, unknown> = {};
  if (text !== undefined) data.text = text;
  if (checked !== undefined) data.checked = checked;

  const existing = await prisma.subItem.findFirst({
    where: { id, goal: { userId } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Sub-item not found' });
    return;
  }

  const sub = await prisma.subItem.update({ where: { id }, data });

  res.json({ id: sub.id, text: sub.text, type: sub.type, checked: sub.checked });
});

/* ─── DELETE /api/goals/subs/:id ─── */

router.delete('/subs/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const id = req.params.id as string;
  const result = await prisma.subItem.deleteMany({
    where: { id, goal: { userId } },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Sub-item not found' });
    return;
  }
  res.json({ ok: true });
});

/* ─── POST /api/goals/paste ─── */

interface PasteGoalInput {
  text: string;
  checked: boolean;
  subs: PasteSubInput[];
}

interface PasteSubInput {
  text: string;
  type: 'checkbox' | 'list';
  checked: boolean;
  subs: PasteSubInput[];
}

async function createSubItems(
  subs: PasteSubInput[],
  goalId: string,
  parentId: string | null,
  startOrder: number
): Promise<void> {
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    const created = await prisma.subItem.create({
      data: {
        text: s.text,
        type: s.type,
        checked: s.checked,
        goalId,
        parentId,
        order: startOrder + i,
      },
    });
    if (s.subs && s.subs.length > 0) {
      await createSubItems(s.subs, goalId, created.id, 0);
    }
  }
}

router.post('/paste', async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const { weekKey, goals } = req.body as { weekKey: string; goals: PasteGoalInput[] };
  if (!weekKey || !goals || goals.length === 0) {
    res.status(400).json({ error: 'weekKey and goals are required' });
    return;
  }

  const existingCount = await prisma.goal.count({ where: { weekKey, userId } });

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const goal = await prisma.goal.create({
      data: {
        text: g.text,
        checked: g.checked,
        weekKey,
        order: existingCount + i,
        userId,
      },
    });
    if (g.subs && g.subs.length > 0) {
      await createSubItems(g.subs, goal.id, null, 0);
    }
  }

  // Return updated list
  const allGoals = await prisma.goal.findMany({
    where: { weekKey, userId },
    include: { subs: true },
    orderBy: { order: 'asc' },
  });

  const result = allGoals.map(g => ({
    id: g.id,
    text: g.text,
    checked: g.checked,
    subs: buildSubTree(g.subs, null),
  }));

  res.status(201).json(result);
});

export { router as goalsRouter };
