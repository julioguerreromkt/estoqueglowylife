import ProdutoForm from "@/components/ProdutoForm";
import { getCategorias, getFornecedores, getCamposPersonalizados, getSessao, getUnidades } from "@/lib/data";
import { podeMovimentar } from "@/lib/types";

export default async function NovoProduto() {
  const { perfil } = await getSessao();
  if (!podeMovimentar(perfil!.papel)) return <p className="text-muted">Seu perfil é de consulta e não cadastra produtos.</p>;
  const [categorias, fornecedores, campos, unidades] = await Promise.all([getCategorias(), getFornecedores(), getCamposPersonalizados(), getUnidades()]);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-navy">Cadastrar Produto</h1>
      <ProdutoForm produto={null} categorias={categorias} fornecedores={fornecedores} campos={campos} unidades={unidades} saldos={[]} />
    </div>
  );
}
