import { notFound } from "next/navigation";
import ProdutoForm from "@/components/ProdutoForm";
import { getCategorias, getFornecedores, getCamposPersonalizados, getSessao, getUnidades, getProduto } from "@/lib/data";
import { podeMovimentar } from "@/lib/types";

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil } = await getSessao();
  if (!podeMovimentar(perfil!.papel)) return <p className="text-muted">Seu perfil é de consulta e não edita produtos.</p>;
  const [{ produto, saldos }, categorias, fornecedores, campos, unidades] = await Promise.all([getProduto(id), getCategorias(), getFornecedores(), getCamposPersonalizados(), getUnidades()]);
  if (!produto) notFound();
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Editar: {produto.nome}</h1>
      <ProdutoForm produto={produto} categorias={categorias} fornecedores={fornecedores} campos={campos} unidades={unidades} saldos={saldos} />
    </div>
  );
}
