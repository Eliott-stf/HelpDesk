export type Role = 'user' | 'technician';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  status: Status;
  authorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  authorId: string;
  type: 'STATUS' | 'CONTENT';
  field: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}
