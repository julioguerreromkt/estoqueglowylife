import Link from "next/link";
import { getSaldosProduto, getSessao, getUnidades, getCategorias } from "@/lib/data";
import Catalogo from "@/components/Catalogo";
import { BotoesMovimento } from "@/components/MovimentoForm";
import { Plus } from "lucide-react";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { perfil } = await getSessao();
  const [saldos, unidades, categorias] = await Promise.all([getSaldosProduto(), getUnidades(), getCategorias()]);
  const opcoes = saldos.map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, por_unidade: s.por_unidade }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-navy">Catálogo de Produtos</h1><p className="text-muted">Estoque por unidade e consolidado</p></div>
        <div className="flex flex-wrap gap-2">
          <BotoesMovimento produtos={opcoes} unidades={unidades} papel={perfil!.papel} compacto />
          <Link href="/produtos/novo" className="btn btn-gold btn-sm"><Plus size={16} /> Cadastrar Produto</Link>
        </div>
      </div>
      <Catalogo saldos={saldos} unidades={unidades} categorias={categorias} papel={perfil!.papel} statusInicial={status} />
    </div>
  );
}
