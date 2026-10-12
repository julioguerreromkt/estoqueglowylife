import { getFornecedores, getSessao } from "@/lib/data";
import Fornecedores from "@/components/Fornecedores";

export default async function FornecedoresPage() {
  const { perfil } = await getSessao();
  const lista = await getFornecedores();
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-navy">Fornecedores</h1><p className="text-muted">Cadastro para vincular na ficha dos produtos</p></div>
      <Fornecedores lista={lista} papel={perfil!.papel} />
    </div>
  );
}
