import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../auth';
import type { Ticket } from '../types';

const categories = ['Matériel', 'Réseau', 'Logiciel', 'Compte/Accès', 'Autre'];
const statusLabel = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', CLOSED: 'Fermé' };
const statusStyle = { OPEN: 'bg-emerald-950 text-emerald-300', IN_PROGRESS: 'bg-amber-950 text-amber-300', CLOSED: 'bg-slate-800 text-slate-400' };

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: categories[0] });

  async function load() {
    try {
      setError('');
      setTickets((await api.getTickets()).tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createTicket(form);
      setForm({ title: '', description: '', category: categories[0] });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le ticket');
    }
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-sm text-cyan-400">Bonjour {user?.name}</p>
        <h1 className="text-3xl font-bold">Tickets</h1>
      </div>
      {error && <p className="mb-5 rounded-lg bg-red-950 p-3 text-red-300">{error}</p>}
      {user?.role === 'user' && (
        <form onSubmit={create} className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-lg font-semibold">Nouveau ticket</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input required minLength={3} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400">{categories.map((category) => <option key={category}>{category}</option>)}</select>
          </div>
          <textarea required minLength={10} placeholder="Décris ton problème..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-3 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400" />
          <button className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400">Créer le ticket</button>
        </form>
      )}
      {loading ? <p className="text-slate-400">Chargement des tickets...</p> : tickets.length === 0 ? <p className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">Aucun ticket pour le moment.</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="font-semibold">{ticket.title}</h2>
                <span className={`rounded-full px-2 py-1 text-xs ${statusStyle[ticket.status]}`}>{statusLabel[ticket.status]}</span>
              </div>
              <p className="mb-4 line-clamp-2 text-sm text-slate-400">{ticket.description}</p>
              <span className="text-xs text-cyan-400">{ticket.category}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
