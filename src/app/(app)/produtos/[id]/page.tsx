import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduto, getSessao, getUnidades, getCategorias, getFornecedores, getCamposPersonalizados } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { brl, num, dataBr, dataHoraBr } from "@/lib/format";
import { podeMovimentar } from "@/lib/types";
import { StatusBadge, TipoBadge } from "@/components/ui";
import { BotoesMovimento } from "@/components/MovimentoForm";
import GaleriaProduto from "@/components/GaleriaProduto";

export default async function FichaProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perfil } = await getSessao();
  const [{ produto, saldos, imagens, anexos, movs }, unidades, categorias, fornecedores, campos] = await Promise.all([getProduto(id), getUnidades(), getCategorias(), getFornecedores(), getCamposPersonalizados()]);
  if (!produto) notFound();
  const supabase = await createClient();
  const { data: resp } = produto.atualizado_por ? await supabase.from("perfis").select("nome").eq("id", produto.atualizado_por).maybeSingle() : { data: null };
  const ativas = unidades.filter((u) => u.ativa);
  const porUnidade: Record<string, number> = {};
  saldos.forEach((s: { unidade_id: string; quantidade: number }) => { const u = unidades.find((x) => x.id === s.unidade_id); if (u) porUnidade[u.codigo] = s.quantidade; });
  const total = saldos.reduce((a: number, s: { quantidade: number }) => a + s.quantidade, 0);
  const reservada = saldos.reduce((a: number, s: { reservada: number }) => a + s.reservada, 0);
  const minimo = saldos.reduce((a: number, s: { estoque_minimo: number }) => a + s.estoque_minimo, 0);
  const status = total === 0 ? "ESGOTADO" : minimo > 0 && total <= minimo ? "BAIXO" : "NORMAL";
  const categoria = categorias.find((c) => c.id === produto.categoria_id)?.nome;
  const fornecedor = fornecedores.find((f) => f.id === produto.fornecedor_id)?.nome;
  const extras = produto.campos_extras as Record<string, string>;
  const editar = podeMovimentar(perfil!.papel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {produto.foto_principal_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.foto_principal_url} alt={produto.nome} className="w-20 h-20 rounded-xl object-cover border border-line" />
          ) : <div className="w-20 h-20 rounded-xl bg-navy/5 flex items-center justify-center text-navy font-bold text-2xl">{produto.nome.slice(0, 2)}</div>}
          <div>
            <div className="text-xs font-mono text-muted">{produto.sku}{produto.codigo_interno ? ` · ${produto.codigo_interno}` : ""}</div>
            <h1 className="text-2xl font-bold text-navy">{produto.nome}</h1>
            <div className="flex gap-2 mt-1 items-center"><StatusBadge status={status} />{!produto.ativo && <span className="badge badge-neutro">inativo</span>}{categoria && <span className="badge badge-neutro">{categoria}</span>}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotoesMovimento produtos={[{ id: produto.id, nome: produto.nome, sku: produto.sku, por_unidade: porUnidade }]} unidades={unidades} papel={perfil!.papel} produtoFixo={produto.id} compacto />
          {editar && <Link href={`/produtos/${produto.id}/editar`} className="btn btn-outline btn-sm">Editar ficha</Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {ativas.map((u) => { const s = saldos.find((x: { unidade_id: string }) => x.unidade_id === u.id); return (
          <div key={u.id} className="card p-4"><div className="text-xs text-muted font-semibold uppercase">{u.nome}</div><div className="kpi-valor mt-1">{num(s?.quantidade ?? 0)}</div><div className="text-xs text-muted">mín. {s?.estoque_minimo ?? 0}{s?.localizacao ? ` · ${s.localizacao}` : ""}</div></div>
        ); })}
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Total</div><div className="kpi-valor mt-1">{num(total)}</div></div>
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Reservada</div><div className="kpi-valor mt-1">{num(reservada)}</div></div>
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Disponível</div><div className="kpi-valor mt-1 text-green">{num(total - reservada)}</div></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 space-y-3 lg:col-span-1">
          <h2 className="font-bold text-navy">Ficha</h2>
          <Dl itens={[
            ["Marca", produto.marca], ["Modelo", produto.modelo], ["Subcategoria", produto.subcategoria], ["Código de barras", produto.codigo_barras],
            ["Unidade de medida", produto.unidade_medida], ["Variações", Object.entries(produto.variacoes ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ") || null],
            ["Fornecedor", fornecedor ?? null], ["Ref. fornecedor", produto.referencia_fornecedor],
            ["Custo unitário", produto.custo_unitario != null ? brl(produto.custo_unitario) : null], ["Preço de venda", produto.preco_venda != null ? brl(produto.preco_venda) : null],
            ["Última compra", produto.data_ultima_compra ? dataBr(produto.data_ultima_compra) : null],
            ...campos.map((c) => [c.rotulo, extras?.[c.chave] ?? null] as [string, string | null]),
            ["Observações", produto.observacoes],
            ["Cadastrado em", dataHoraBr(produto.criado_em)], ["Última atualização", dataHoraBr(produto.atualizado_em)], ["Responsável pela alteração", resp?.nome ?? (produto.atualizado_por ? "usuário" : "importação")],
          ]} />
          {produto.descricao && <p className="text-sm text-ink whitespace-pre-line border-t border-line pt-3">{produto.descricao}</p>}
        </div>
        <div className="card p-5 lg:col-span-2">
          <GaleriaProduto produtoId={produto.id} sku={produto.sku} fotoPrincipal={produto.foto_principal_url} imagens={imagens} anexos={anexos} podeEditar={editar} />
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-line flex justify-between items-center"><h2 className="font-bold text-navy">Histórico de entradas, saídas e transferências</h2><span className="text-sm text-muted">{movs.length} registro(s){movs.length === 300 ? " (últimos 300)" : ""}</span></div>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>Data</th><th>Tipo</th><th>Unidade</th><th className="num">Anterior</th><th className="num">Qtd</th><th className="num">Saldo</th><th>Destino / motivo</th><th>Ref.</th><th>Obs.</th></tr></thead>
          <tbody>{movs.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap">{dataBr(m.data_movimento)}{m.data_estimada && <span title="Data estimada na importação" className="text-amber"> *</span>}</td>
              <td><TipoBadge tipo={m.tipo} /></td><td>{m.unidades?.nome}</td>
              <td className="num text-muted">{num(m.saldo_anterior)}</td>
              <td className={`num font-bold ${m.tipo === "ENTRADA" || m.tipo === "TRANSF_ENTRADA" ? "text-green" : m.tipo === "AJUSTE" ? "" : "text-amber"}`}>{m.tipo === "ENTRADA" || m.tipo === "TRANSF_ENTRADA" ? "+" : m.tipo === "AJUSTE" ? "=" : "−"}{num(m.tipo === "AJUSTE" ? m.saldo_resultante : m.quantidade)}</td>
              <td className="num font-semibold">{num(m.saldo_resultante)}</td>
              <td>{m.destino ?? m.motivo ?? ""}{m.justificativa ? <div className="text-xs text-muted">{m.justificativa}</div> : null}</td>
              <td className="text-muted">{m.referencia ?? ""}</td><td className="text-muted">{m.observacoes ?? ""}{m.importado && <span className="badge badge-neutro ml-1">planilha</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}

function Dl({ itens }: { itens: [string, string | null | undefined][] }) {
  return (
    <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      {itens.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className={v ? "" : "text-muted italic"}>{v || "pendente"}</dd></div>))}
    </dl>
  );
}
