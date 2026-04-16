import React, { useState } from 'react';
import { getSupabase } from '../supabase';
const supabase = getSupabase();

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase não está configurado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase não está configurado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Verifique seu e-mail para confirmar o cadastro.');
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase não está configurado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) alert(error.message);
    else alert('E-mail de recuperação enviado.');
    setLoading(false);
  };

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <h1 className="text-2xl font-bold mb-6">Configuração do Supabase ausente</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
          Defina as variáveis de ambiente <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> em <code className="font-mono">.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950">
      <h1 className="text-2xl font-bold mb-6">
        {mode === 'login' ? 'Login' : mode === 'signup' ? 'Cadastrar' : 'Recuperar Senha'}
      </h1>
      <form 
        onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignUp : handleForgotPassword} 
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border rounded-xl" required />
        {mode !== 'forgot' && (
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border rounded-xl" required />
        )}
        <button type="submit" className="p-3 bg-brand-blue text-white rounded-xl font-bold" disabled={loading}>
          {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Cadastrar' : 'Enviar'}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        {mode !== 'login' && (
          <button onClick={() => setMode('login')} className="text-brand-blue font-bold">Voltar para Login</button>
        )}
        {mode === 'login' && (
          <>
            <button onClick={() => setMode('signup')} className="text-brand-blue font-bold">Não tem conta? Cadastre-se</button>
            <button onClick={() => setMode('forgot')} className="text-slate-500">Esqueci minha senha</button>
          </>
        )}
      </div>
    </div>
  );
};
