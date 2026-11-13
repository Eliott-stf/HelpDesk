import type { HistoryEntry, Message, Ticket, User } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let accessToken: string | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshHandler(handler: () => Promise<boolean>) {
  refreshHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (response.status === 401 && retry && refreshHandler && await refreshHandler()) {
    return request<T>(path, options, false);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message ?? 'Une erreur est survenue');
  return body as T;
}

export async function login(email: string, password: string) {
  return request<{ user: User; accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return request<{ user: User; accessToken: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function refresh() {
  return request<{ user: User; accessToken: string }>('/auth/refresh', { method: 'POST' }, false);
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' }, false);
}

export const getTickets = () => request<{ tickets: Ticket[] }>('/tickets');
export const getTicket = (id: string) => request<{ ticket: Ticket }>(`/tickets/${id}`);
export const createTicket = (ticket: Pick<Ticket, 'title' | 'description' | 'category'>) =>
  request<{ ticket: Ticket }>('/tickets', { method: 'POST', body: JSON.stringify(ticket) });
export const updateTicket = (id: string, ticket: Partial<Pick<Ticket, 'title' | 'description' | 'category'>>) =>
  request<{ ticket: Ticket }>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(ticket) });
export const changeStatus = (id: string, action: 'take' | 'release' | 'close' | 'reopen') =>
  request<{ ticket: Ticket }>(`/tickets/${id}/${action}`, { method: 'POST' });
export const getMessages = (id: string) => request<{ messages: Message[] }>(`/tickets/${id}/messages`);
export const sendMessage = (id: string, content: string) =>
  request<{ message: Message }>(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
export const getHistory = (id: string) => request<{ history: HistoryEntry[] }>(`/tickets/${id}/history`);
