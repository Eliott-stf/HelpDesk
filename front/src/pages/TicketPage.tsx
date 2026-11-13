import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../auth';
import type { HistoryEntry, Message, Ticket } from '../types';

const statusLabel = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', CLOSED: 'Fermé' };

export default function TicketPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [content, setContent] = useState('');
  const [edit, setEdit] = useState({ title: '', description: '', category: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [ticketRes, messagesRes, historyRes] = await Promise.all([api.getTicket(id), api.getMessages(id), api.getHistory(id)]);
      setTicket(ticketRes.ticket);
      setEdit({ title: ticketRes.ticket.title, description: ticketRes.ticket.description, category: ticketRes.ticket.category });
      setMessages(messagesRes.messages);
      setHistory(historyRes.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le ticket');
    }
  }
  useEffect(() => { load(); }, [id]);

  async function action(name: 'take' | 'release' | 'close' | 'reopen') {
    try { await api.changeStatus(id, name); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Action impossible'); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    try { await api.sendMessage(id, content); setContent(''); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Message impossible à envoyer'); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    try { await api.updateTicket(id, edit); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Modification impossible'); }
  }

  if (error && !ticket) return <p className="rounded-lg bg-red-950 p-4 text-red-300">{error}</p>;
  if (!ticket) return <p className="text-slate-400">Chargement...</p>;
  const isAuthor = user?.id === ticket.authorId;
  const isAssignee = user?.id === ticket.assigneeId;
  const canReply = ticket.status !== 'CLOSED' && (isAuthor || isAssignee);
  return (
    <>
      <Link to="/" className="text-sm text-cyan-400 hover:underline">← Retour aux tickets</Link>
      {error && <p className="mt-4 rounded-lg bg-red-950 p-3 text-red-300">{error}</p>}
      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="mb-2 text-sm text-cyan-400">{ticket.category}</p><h1 className="text-3xl font-bold">{ticket.title}</h1></div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">{statusLabel[ticket.status]}</span>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-slate-300">{ticket.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {user?.role === 'technician' && ticket.status === 'OPEN' && <button onClick={() => action('take')} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Prendre en charge</button>}
          {isAssignee && ticket.status === 'IN_PROGRESS' && <><button onClick={() => action('release')} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Libérer</button><button onClick={() => action('close')} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Fermer</button></>}
          {ticket.status === 'CLOSED' && (isAuthor || user?.role === 'technician') && <button onClick={() => action('reopen')} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Rouvrir</button>}
        </div>
      </section>
      {isAuthor && ticket.status === 'OPEN' && (
        <form onSubmit={save} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 font-semibold">Modifier le ticket</h2>
          <input required value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <textarea required minLength={10} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="mb-3 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <button className="rounded-lg border border-cyan-500 px-3 py-2 text-sm text-cyan-300">Enregistrer</button>
        </form>
      )}
      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Discussion</h2>
        <div className="space-y-3">{messages.map((message) => <article key={message.id} className="rounded-lg bg-slate-950 p-4"><p>{message.content}</p><p className="mt-2 text-xs text-slate-500">{message.authorId === user?.id ? 'Vous' : 'Participant'} · {new Date(message.createdAt).toLocaleString('fr-FR')}</p></article>)}</div>
        {canReply && <form onSubmit={send} className="mt-5 flex gap-2"><input required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Votre réponse..." className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" /><button className="rounded-lg bg-cyan-500 px-4 font-semibold text-slate-950">Envoyer</button></form>}
      </section>
      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Historique</h2>
        <div className="space-y-2 text-sm text-slate-400">{history.length === 0 ? <p>Aucun changement.</p> : history.map((entry) => <p key={entry.id}><span className="text-slate-200">{entry.field}</span> : {entry.oldValue} → {entry.newValue}</p>)}</div>
      </section>
    </>
  );
}
