import { useState, useCallback, useEffect } from 'react';
import type { Goal, SubItem } from '../types';
import * as api from '../api';

/* ─── Markdown helpers (for copy / paste) ─── */

function parseSubsFromMarkdown(lines: string[], startIdx: number, parentIndent: number): { subs: SubItem[]; nextIdx: number } {
  const subs: SubItem[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)- /);
    if (!match) { i++; continue; }
    const indent = match[1].length / 2;
    if (indent <= parentIndent) break;
    if (indent !== parentIndent + 1) { i++; continue; }
    const cbMatch = line.match(/^\s*- \[([ x])\] (.+)/);
    const listMatch = !cbMatch ? line.match(/^\s*- (.+)/) : null;
    if (!cbMatch && !listMatch) { i++; continue; }
    const isCheckbox = !!cbMatch;
    const text = cbMatch ? cbMatch[2] : listMatch![1];
    const checked = cbMatch ? cbMatch[1] === 'x' : false;
    i++;
    const children = parseSubsFromMarkdown(lines, i, indent);
    subs.push({ id: '', text, type: isCheckbox ? 'checkbox' : 'list', checked, subs: children.subs });
    i = children.nextIdx;
  }
  return { subs, nextIdx: i };
}

function parseMarkdownGoals(markdown: string): Goal[] {
  const lines = markdown.split('\n').filter(l => l.match(/^\s*- /));
  const goals: Goal[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^- \[([ x])\] (.+)/);
    if (!match) { i++; continue; }
    i++;
    const children = parseSubsFromMarkdown(lines, i, 0);
    goals.push({ id: '', text: match[2], checked: match[1] === 'x', subs: children.subs });
    i = children.nextIdx;
  }
  return goals;
}

function formatSubsForCopy(subs: SubItem[], indent: number): string {
  let text = '';
  const prefix = '  '.repeat(indent);
  subs.forEach(s => {
    if (s.type === 'checkbox') {
      text += `${prefix}- [${s.checked ? 'x' : ' '}] ${s.text}\n`;
    } else {
      text += `${prefix}- ${s.text}\n`;
    }
    if (s.subs && s.subs.length > 0) {
      text += formatSubsForCopy(s.subs, indent + 1);
    }
  });
  return text;
}

/* ─── Week helpers ─── */

function getWeekKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return mon.toISOString().slice(0, 10);
}

export function getWeekRange(offset: number): { start: Date; end: Date } {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
}

export function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─── Hook ─── */

export function useGoals() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);

  const loadGoals = useCallback(async (offset: number) => {
    try {
      const weekKey = getWeekKey(offset);
      const data = await api.fetchGoals(weekKey);
      setGoals(data);
    } catch {
      // Ignore fetch failures; auth errors are handled globally.
    }
  }, []);

  useEffect(() => {
    loadGoals(0);
  }, [loadGoals]);

  const prevWeek = useCallback(() => {
    setWeekOffset(prev => {
      const next = prev - 1;
      loadGoals(next);
      return next;
    });
  }, [loadGoals]);

  const nextWeek = useCallback(() => {
    setWeekOffset(prev => {
      const next = prev + 1;
      loadGoals(next);
      return next;
    });
  }, [loadGoals]);

  const addGoal = useCallback(async (text: string) => {
    try {
      const weekKey = getWeekKey(weekOffset);
      const newGoal = await api.createGoal(text, weekKey);
      setGoals(prev => [...prev, newGoal]);
    } catch {
      // Ignore create failures; auth errors are handled globally.
    }
  }, [weekOffset]);

  const deleteGoal = useCallback(async (id: string) => {
    try {
      await api.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch {
      // Ignore delete failures.
    }
  }, []);

  const toggleGoal = useCallback(async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    try {
      await api.updateGoal(id, { checked: !goal.checked });
      setGoals(prev => prev.map(g => g.id === id ? { ...g, checked: !g.checked } : g));
    } catch {
      // Ignore update failures.
    }
  }, [goals]);

  const addSubItem = useCallback(async (goalId: string, text: string, type: 'checkbox' | 'list', parentSubId?: string) => {
    try {
      await api.createSubItem(goalId, text, type, parentSubId);
      await loadGoals(weekOffset);
    } catch {
      // Ignore create failures.
    }
  }, [weekOffset, loadGoals]);

  const toggleSub = useCallback(async (goalId: string, subId: string) => {
    // Find current checked state by traversing the tree
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const findSub = (subs: SubItem[]): SubItem | undefined => {
      for (const s of subs) {
        if (s.id === subId) return s;
        const found = findSub(s.subs || []);
        if (found) return found;
      }
      return undefined;
    };
    const sub = findSub(goal.subs);
    if (!sub) return;
    try {
      await api.updateSubItem(subId, { checked: !sub.checked });
      await loadGoals(weekOffset);
    } catch {
      // Ignore update failures.
    }
  }, [goals, weekOffset, loadGoals]);

  const removeSub = useCallback(async (_goalId: string, subId: string) => {
    try {
      await api.deleteSubItem(subId);
      await loadGoals(weekOffset);
    } catch {
      // Ignore delete failures.
    }
  }, [weekOffset, loadGoals]);

  const renameGoal = useCallback(async (id: string, newText: string) => {
    try {
      await api.updateGoal(id, { text: newText });
      setGoals(prev => prev.map(g => g.id === id ? { ...g, text: newText } : g));
    } catch {
      // Ignore update failures.
    }
  }, []);

  const renameSub = useCallback(async (_goalId: string, subId: string, newText: string) => {
    try {
      await api.updateSubItem(subId, { text: newText });
      await loadGoals(weekOffset);
    } catch {
      // Ignore update failures.
    }
  }, [weekOffset, loadGoals]);

  const copyState = useCallback((): Promise<boolean> => {
    const range = getWeekRange(weekOffset);
    const year = range.start.getFullYear();
    const weekNum = getISOWeek(range.start);

    let text = `# ${year} 第 ${weekNum} 週目標（${formatDate(range.start)} — ${formatDate(range.end)}）\n\n`;

    if (goals.length === 0) {
      text += '（尚無目標）';
    } else {
      goals.forEach((g, i) => {
        text += `- [${g.checked ? 'x' : ' '}] ${g.text}\n`;
        if (g.subs && g.subs.length > 0) {
          text += formatSubsForCopy(g.subs, 1);
        }
        if (i < goals.length - 1) text += '\n';
      });
    }

    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }, [weekOffset, goals]);

  const pasteGoals = useCallback(async (): Promise<'ok' | 'empty' | 'fail'> => {
    try {
      const clipText = await navigator.clipboard.readText();
      const parsed = parseMarkdownGoals(clipText);
      if (parsed.length === 0) return 'empty';
      const weekKey = getWeekKey(weekOffset);
      const updated = await api.pasteGoals(weekKey, parsed);
      setGoals(updated);
      return 'ok';
    } catch {
      return 'fail';
    }
  }, [weekOffset]);

  return {
    weekOffset,
    goals,
    prevWeek,
    nextWeek,
    addGoal,
    deleteGoal,
    toggleGoal,
    addSubItem,
    toggleSub,
    removeSub,
    renameGoal,
    renameSub,
    copyState,
    pasteGoals,
  };
}
