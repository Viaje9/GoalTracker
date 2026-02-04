import type { AuthUser, Goal, SubItem } from './types';

const API_BASE = '/api';
const TOKEN_KEY = 'goal-tracker-token';

export const AUTH_EVENT = 'auth:expired';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent(AUTH_EVENT));
    }
    const payload = await res.json().catch(() => null);
    const message = payload?.error || `API error: ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me');
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
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
