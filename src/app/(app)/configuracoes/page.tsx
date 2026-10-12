import { getSessao, getPerfis, getUnidades, getCategorias, getCamposPersonalizados } from "@/lib/data";
import Configuracoes from "@/components/Configuracoes";

export default async function ConfiguracoesPage() {
  const { perfil } = await getSessao();
  const admin = perfil!.papel === "admin";
  const [perfis, unidades, categorias, campos] = await Promise.all([admin ? getPerfis() : Promise.resolve([]), getUnidades(), getCategorias(), getCamposPersonalizados()]);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-navy">Usuários e Configurações</h1><p className="text-muted">{admin ? "Usuários, unidades, categorias, campos personalizados e importação" : "Importação, exportação e sua conta"}</p></div>
      <Configuracoes eu={perfil!} perfis={perfis} unidades={unidades} categorias={categorias} campos={campos} />
    </div>
  );
}
