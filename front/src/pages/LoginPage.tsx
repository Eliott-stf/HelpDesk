import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (register) await signUp(name, email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de se connecter');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">Campus support</p>
        <h1 className="mb-8 text-3xl font-bold">{register ? 'Créer un compte' : 'Connexion'}</h1>
        {error && <p className="mb-4 rounded-lg bg-red-950 p-3 text-sm text-red-300">{error}</p>}
        {register && (
          <label className="mb-4 block text-sm text-slate-300">
            Nom
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400" />
          </label>
        )}
        <label className="mb-4 block text-sm text-slate-300">
          E-mail
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-6 block text-sm text-slate-300">
          Mot de passe
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400" />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {busy ? 'Patientez...' : register ? "S'inscrire" : 'Se connecter'}
        </button>
        <button type="button" onClick={() => { setRegister(!register); setError(''); }} className="mt-5 w-full text-sm text-slate-400 hover:text-cyan-400">
          {register ? 'J’ai déjà un compte' : 'Créer un compte utilisateur'}
        </button>
      </form>
    </main>
  );
}
