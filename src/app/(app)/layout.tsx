import Sidebar from "@/components/Sidebar";
import { getSessao, getUnidades } from "@/lib/data";
import { sair } from "@/app/actions/cadastros";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil, user } = await getSessao();
  if (!perfil) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-navy">Acesso ainda não liberado</h1>
          <p className="text-muted mt-2">Seu usuário ({user.email}) existe, mas está inativo ou sem perfil. Peça ao administrador para ativar o acesso.</p>
          <form action={sair} className="mt-4"><button className="btn btn-outline">Sair</button></form>
        </div>
      </main>
    );
  }
  const unidades = await getUnidades();
  return (
    <div className="lg:flex min-h-screen">
      <Sidebar unidades={unidades} perfil={perfil} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
