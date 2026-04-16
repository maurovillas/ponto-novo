import { ArrowRight, CalendarDays, History, Settings, Clock3, MapPin, UserCheck, Users } from 'lucide-react';

type InterfaceProps = {
  user: any;
  onLogout: () => void;
  onNavigateToUsers?: () => void;
};

export default function Interface({ user, onLogout, onNavigateToUsers }: InterfaceProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-brand-blue text-white p-4 sm:p-6">
        <div className="mx-auto max-w-7xl flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <span className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-brand-lime block">Ponto Novo</span>
            <h1 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-bold truncate">Bem-vindo, {user.displayName || user.email || 'usuário'}</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm opacity-80 hidden sm:block">Painel de controle para registro de ponto e histórico.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-3xl bg-white/10 p-3 sm:p-4 backdrop-blur-xl w-full md:w-auto">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center text-brand-lime flex-shrink-0">
              <UserCheck size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1 md:flex-initial">
              <p className="text-xs sm:text-sm opacity-80 hidden sm:block">Conectado como</p>
              <p className="font-semibold text-sm sm:text-base truncate">{user.email || 'sem email'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl sm:rounded-[2rem] bg-white p-4 sm:p-6 shadow-lg shadow-slate-200/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.18em] text-slate-500 block">Hoje</span>
                <h2 className="mt-2 sm:mt-3 text-lg sm:text-xl md:text-2xl font-bold truncate">{formattedDate}</h2>
              </div>
              <div className="rounded-2xl sm:rounded-3xl bg-brand-lime/10 px-3 sm:px-4 py-2 sm:py-3 text-brand-navy font-semibold text-sm sm:text-base self-start sm:self-auto">Online</div>
            </div>

            <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <article className="rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 text-brand-blue">
                  <Clock3 size={18} className="sm:w-5 sm:h-5" />
                  <span className="font-semibold text-sm sm:text-base">Registro Rápido</span>
                </div>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-600">Registre sua entrada, saída ou intervalo em poucos toques.</p>
              </article>
              <article className="rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 text-brand-blue">
                  <CalendarDays size={18} className="sm:w-5 sm:h-5" />
                  <span className="font-semibold text-sm sm:text-base">Resumo Diário</span>
                </div>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-600">Veja seu tempo trabalhado, saldo e próximos compromissos.</p>
              </article>
            </div>

            <div className="mt-6 sm:mt-8 rounded-xl sm:rounded-[1.5rem] bg-brand-blue/5 p-4 sm:p-6 text-slate-700">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.24em] text-brand-blue">Saldo do dia</p>
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl md:text-4xl font-bold">+ 03h 24m</p>
                </div>
                <div className="rounded-2xl sm:rounded-3xl bg-white p-3 sm:p-4 text-brand-blue shadow-sm flex-shrink-0">
                  <MapPin size={24} className="sm:w-7 sm:h-7" />
                </div>
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-600">Seu próximo registro está pronto para ser realizado.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <div className="rounded-2xl sm:rounded-[2rem] bg-white p-4 sm:p-6 shadow-lg shadow-slate-200/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold">Ações rápidas</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Use os botões abaixo para ir direto ao ponto.</p>
                </div>
                <button onClick={onLogout} className="rounded-full bg-rose-500 px-3 sm:px-4 py-2 text-white transition hover:bg-rose-600 text-sm sm:text-base self-start sm:self-auto">
                  Sair
                </button>
              </div>

              <div className="mt-4 sm:mt-6 grid gap-2 sm:gap-3">
                <button className="flex items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-200 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Registrar ponto</p>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">Entrada / saída / descanso</p>
                  </div>
                  <ArrowRight size={18} className="text-brand-blue flex-shrink-0 ml-2" />
                </button>
                <button className="flex items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-200 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Ver histórico</p>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">Acompanhe registros anteriores.</p>
                  </div>
                  <History size={18} className="text-brand-blue flex-shrink-0 ml-2" />
                </button>
                <button className="flex items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-200 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Configurações</p>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">Personalize sua conta.</p>
                  </div>
                  <Settings size={18} className="text-brand-blue flex-shrink-0 ml-2" />
                </button>
                {onNavigateToUsers && (
                  <button
                    onClick={onNavigateToUsers}
                    className="flex items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-200 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">Gerenciar Usuários</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">Administre usuários do sistema.</p>
                    </div>
                    <Users size={18} className="text-brand-blue flex-shrink-0 ml-2" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-[2rem] bg-white p-4 sm:p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-center gap-2 sm:gap-3 text-brand-blue">
                <div className="rounded-2xl sm:rounded-3xl bg-brand-blue/10 p-2 sm:p-3 flex-shrink-0">
                  <Clock3 size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold truncate">Próximo registro</h3>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Ainda não há evento agendado para hoje.</p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl bg-slate-50 p-3 sm:p-4 text-slate-700">
                <p className="text-xs sm:text-sm">Entrada prevista</p>
                <p className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl font-bold">08:00</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
