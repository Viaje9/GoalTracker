import { useState, useCallback } from 'react';
import type { Goal, SubItem, GoalData } from '../types';

const STORAGE_KEY = 'goaltracker_data';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─── Recursive tree helpers ─── */

function findSubInTree(subs: SubItem[], subId: string): SubItem | undefined {
  for (const s of subs) {
    if (s.id === subId) return s;
    const found = findSubInTree(s.subs || [], subId);
    if (found) return found;
  }
  return undefined;
}

function removeSubFromTree(subs: SubItem[], subId: string): SubItem[] {
  return subs
    .filter(s => s.id !== subId)
    .map(s => ({ ...s, subs: removeSubFromTree(s.subs || [], subId) }));
}

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
    subs.push({ id: generateId(), text, type: isCheckbox ? 'checkbox' : 'list', checked: false, subs: children.subs });
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
    goals.push({ id: generateId(), text: match[2], checked: false, subs: children.subs });
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

function loadData(): GoalData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveData(data: GoalData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useGoals() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [goals, setGoals] = useState<Goal[]>(() => {
    const data = loadData();
    return data[getWeekKey(0)] || [];
  });

  const refresh = useCallback((offset: number) => {
    const data = loadData();
    setGoals(data[getWeekKey(offset)] || []);
  }, []);

  const prevWeek = useCallback(() => {
    setWeekOffset(prev => {
      const next = prev - 1;
      refresh(next);
      return next;
    });
  }, [refresh]);

  const nextWeek = useCallback(() => {
    setWeekOffset(prev => {
      const next = prev + 1;
      refresh(next);
      return next;
    });
  }, [refresh]);

  const addGoal = useCallback((text: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    list.push({ id: generateId(), text, checked: false, subs: [] });
    data[key] = list;
    saveData(data);
    setGoals(list);
  }, [weekOffset]);

  const deleteGoal = useCallback((id: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = (data[key] || []).filter(g => g.id !== id);
    data[key] = list;
    saveData(data);
    setGoals(list);
  }, [weekOffset]);

  const toggleGoal = useCallback((id: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === id);
    if (goal) {
      goal.checked = !goal.checked;
      data[key] = list;
      saveData(data);
      setGoals([...list]);
    }
  }, [weekOffset]);

  const addSubItem = useCallback((goalId: string, text: string, type: 'checkbox' | 'list', parentSubId?: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === goalId);
    if (goal) {
      const newSub: SubItem = { id: generateId(), text, type, checked: false, subs: [] };
      if (parentSubId) {
        const parent = findSubInTree(goal.subs || [], parentSubId);
        if (parent) {
          if (!parent.subs) parent.subs = [];
          parent.subs.push(newSub);
        }
      } else {
        if (!goal.subs) goal.subs = [];
        goal.subs.push(newSub);
      }
      data[key] = list;
      saveData(data);
      setGoals([...list]);
    }
  }, [weekOffset]);

  const toggleSub = useCallback((goalId: string, subId: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === goalId);
    if (goal) {
      const sub = findSubInTree(goal.subs || [], subId);
      if (sub) {
        sub.checked = !sub.checked;
        data[key] = list;
        saveData(data);
        setGoals([...list]);
      }
    }
  }, [weekOffset]);

  const removeSub = useCallback((goalId: string, subId: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === goalId);
    if (goal && goal.subs) {
      goal.subs = removeSubFromTree(goal.subs, subId);
      data[key] = list;
      saveData(data);
      setGoals([...list]);
    }
  }, [weekOffset]);

  const renameGoal = useCallback((id: string, newText: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === id);
    if (goal) {
      goal.text = newText;
      data[key] = list;
      saveData(data);
      setGoals([...list]);
    }
  }, [weekOffset]);

  const renameSub = useCallback((goalId: string, subId: string, newText: string) => {
    const data = loadData();
    const key = getWeekKey(weekOffset);
    const list = data[key] || [];
    const goal = list.find(g => g.id === goalId);
    if (goal) {
      const sub = findSubInTree(goal.subs || [], subId);
      if (sub) {
        sub.text = newText;
        data[key] = list;
        saveData(data);
        setGoals([...list]);
      }
    }
  }, [weekOffset]);

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
      const data = loadData();
      const key = getWeekKey(weekOffset);
      const existing = data[key] || [];
      data[key] = [...existing, ...parsed];
      saveData(data);
      setGoals(data[key]);
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
