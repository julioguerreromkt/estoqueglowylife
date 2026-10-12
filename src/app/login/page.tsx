import { entrar } from "@/app/actions/cadastros";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold tracking-[.2em] text-gold">GLOWY LIFE</div>
          <h1 className="text-2xl font-bold text-navy mt-1">Controle de Estoque</h1>
          <p className="text-muted text-sm mt-1">Sede e Aracaju em um só lugar</p>
        </div>
        <form action={entrar} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" required className="input" autoComplete="current-password" />
          </div>
          {erro && <p className="text-red text-sm font-medium" role="alert">{erro}</p>}
          <button type="submit" className="btn btn-primary w-full justify-center">Entrar</button>
        </form>
        <p className="text-xs text-muted mt-6 text-center">Sem acesso? Peça ao administrador para criar seu usuário.</p>
      </div>
    </main>
  );
}
