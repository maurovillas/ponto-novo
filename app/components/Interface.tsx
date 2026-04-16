import { ArrowRight, CalendarDays, History, Settings, Clock3, MapPin, UserCheck } from 'lucide-react';

type InterfaceProps = {
  user: any;
  onLogout: () => void;
};

export default function Interface({ user, onLogout }: InterfaceProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-brand-blue text-white p-6">
        <div className="mx-auto max-w-6xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-sm uppercase tracking-[0.3em] text-brand-lime">Ponto Novo</span>
            <h1 className="mt-3 text-3xl font-bold">Bem-vindo, {user.displayName || user.email || 'usuário'}</h1>
            <p className="mt-2 text-sm opacity-80">Painel de controle para registro de ponto e histórico.</p>
          </div>
          <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur-xl">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-brand-lime">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm opacity-80">Conectado como</p>
              <p className="font-semibold">{user.email || 'sem email'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm uppercase tracking-[0.18em] text-slate-500">Hoje</span>
                <h2 className="mt-3 text-2xl font-bold">{formattedDate}</h2>
              </div>
              <div className="rounded-3xl bg-brand-lime/10 px-4 py-3 text-brand-navy font-semibold">Online</div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 text-brand-blue">
                  <Clock3 size={20} />
                  <span className="font-semibold">Registro Rápido</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Registre sua entrada, saída ou intervalo em poucos toques.</p>
              </article>
              <article className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 text-brand-blue">
                  <CalendarDays size={20} />
                  <span className="font-semibold">Resumo Diário</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Veja seu tempo trabalhado, saldo e próximos compromissos.</p>
              </article>
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-brand-blue/5 p-6 text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-brand-blue">Saldo do dia</p>
                  <p className="mt-3 text-4xl font-bold">+ 03h 24m</p>
                </div>
                <div className="rounded-3xl bg-white p-4 text-brand-blue shadow-sm">
                  <MapPin size={28} />
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">Seu próximo registro está pronto para ser realizado.</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Ações rápidas</h3>
                  <p className="text-sm text-slate-500">Use os botões abaixo para ir direto ao ponto.</p>
                </div>
                <button onClick={onLogout} className="rounded-full bg-rose-500 px-4 py-2 text-white transition hover:bg-rose-600">
                  Sair
                </button>
              </div>

              <div className="mt-6 grid gap-3">
                <button className="flex items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div>
                    <p className="font-semibold">Registrar ponto</p>
                    <p className="text-sm text-slate-500">Entrada / saída / descanso</p>
                  </div>
                  <ArrowRight size={20} className="text-brand-blue" />
                </button>
                <button className="flex items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div>
                    <p className="font-semibold">Ver histórico</p>
                    <p className="text-sm text-slate-500">Acompanhe registros anteriores.</p>
                  </div>
                  <History size={20} className="text-brand-blue" />
                </button>
                <button className="flex items-center justify-between rounded-3xl border border-slate-200 px-5 py-4 text-left hover:bg-slate-50 transition">
                  <div>
                    <p className="font-semibold">Configurações</p>
                    <p className="text-sm text-slate-500">Personalize sua conta.</p>
                  </div>
                  <Settings size={20} className="text-brand-blue" />
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-center gap-3 text-brand-blue">
                <div className="rounded-3xl bg-brand-blue/10 p-3">
                  <Clock3 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Próximo registro</h3>
                  <p className="text-sm text-slate-500">Ainda não há evento agendado para hoje.</p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-slate-700">
                <p className="text-sm">Entrada prevista</p>
                <p className="mt-2 text-2xl font-bold">08:00</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
