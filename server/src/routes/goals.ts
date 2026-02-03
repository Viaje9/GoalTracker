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

/* ─── GET /api/goals?weekKey=YYYY-MM-DD ─── */

router.get('/', async (req: Request, res: Response) => {
  const weekKey = req.query.weekKey as string;
  if (!weekKey) {
    res.status(400).json({ error: 'weekKey is required' });
    return;
  }

  const goals = await prisma.goal.findMany({
    where: { weekKey },
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
  const { text, weekKey } = req.body;
  if (!text || !weekKey) {
    res.status(400).json({ error: 'text and weekKey are required' });
    return;
  }

  const count = await prisma.goal.count({ where: { weekKey } });

  const goal = await prisma.goal.create({
    data: { text, weekKey, order: count },
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
  const { id } = req.params;
  const { text, checked } = req.body;

  const data: Record<string, unknown> = {};
  if (text !== undefined) data.text = text;
  if (checked !== undefined) data.checked = checked;

  const goal = await prisma.goal.update({
    where: { id },
    data,
  });

  res.json({ id: goal.id, text: goal.text, checked: goal.checked });
});

/* ─── DELETE /api/goals/:id ─── */

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.goal.delete({ where: { id } });
  res.json({ ok: true });
});

/* ─── POST /api/goals/:goalId/subs ─── */

router.post('/:goalId/subs', async (req: Request, res: Response) => {
  const { goalId } = req.params;
  const { text, type, parentSubId } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
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
  const { id } = req.params;
  const { text, checked } = req.body;

  const data: Record<string, unknown> = {};
  if (text !== undefined) data.text = text;
  if (checked !== undefined) data.checked = checked;

  const sub = await prisma.subItem.update({
    where: { id },
    data,
  });

  res.json({ id: sub.id, text: sub.text, type: sub.type, checked: sub.checked });
});

/* ─── DELETE /api/goals/subs/:id ─── */

router.delete('/subs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.subItem.delete({ where: { id } });
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
  const { weekKey, goals } = req.body as { weekKey: string; goals: PasteGoalInput[] };
  if (!weekKey || !goals || goals.length === 0) {
    res.status(400).json({ error: 'weekKey and goals are required' });
    return;
  }

  const existingCount = await prisma.goal.count({ where: { weekKey } });

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const goal = await prisma.goal.create({
      data: {
        text: g.text,
        checked: g.checked,
        weekKey,
        order: existingCount + i,
      },
    });
    if (g.subs && g.subs.length > 0) {
      await createSubItems(g.subs, goal.id, null, 0);
    }
  }

  // Return updated list
  const allGoals = await prisma.goal.findMany({
    where: { weekKey },
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
