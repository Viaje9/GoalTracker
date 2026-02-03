import type { Goal, SubItem } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchGoals(weekKey: string): Promise<Goal[]> {
  return request<Goal[]>(`/goals?weekKey=${encodeURIComponent(weekKey)}`);
}

export function createGoal(text: string, weekKey: string): Promise<Goal> {
  return request<Goal>('/goals', {
    method: 'POST',
    body: JSON.stringify({ text, weekKey }),
  });
}

export function updateGoal(id: string, data: { text?: string; checked?: boolean }): Promise<Goal> {
  return request<Goal>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteGoal(id: string): Promise<void> {
  return request(`/goals/${id}`, { method: 'DELETE' });
}

export function createSubItem(
  goalId: string,
  text: string,
  type: 'checkbox' | 'list',
  parentSubId?: string
): Promise<SubItem> {
  return request<SubItem>(`/goals/${goalId}/subs`, {
    method: 'POST',
    body: JSON.stringify({ text, type, parentSubId }),
  });
}

export function updateSubItem(id: string, data: { text?: string; checked?: boolean }): Promise<SubItem> {
  return request<SubItem>(`/goals/subs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSubItem(id: string): Promise<void> {
  return request(`/goals/subs/${id}`, { method: 'DELETE' });
}

export function pasteGoals(weekKey: string, goals: Goal[]): Promise<Goal[]> {
  return request<Goal[]>('/goals/paste', {
    method: 'POST',
    body: JSON.stringify({ weekKey, goals }),
  });
}
