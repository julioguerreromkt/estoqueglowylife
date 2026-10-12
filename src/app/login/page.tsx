import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold tracking-[.2em] text-gold">GLOWY LIFE</div>
          <h1 className="text-2xl font-bold text-navy mt-1">Controle de Estoque</h1>
          <p className="text-muted text-sm mt-1">Sede e Aracaju em um só lugar</p>
        </div>
        <LoginForm />
        <p className="text-xs text-muted mt-6 text-center">Sem acesso? Peça ao administrador para criar seu usuário.</p>
      </div>
    </main>
  );
}
