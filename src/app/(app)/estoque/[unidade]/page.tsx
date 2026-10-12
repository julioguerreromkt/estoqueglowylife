import { notFound } from "next/navigation";
import Link from "next/link";
import { getSaldosProduto, getSessao, getUnidades } from "@/lib/data";
import { getMovimentacoes } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { num, dataBr } from "@/lib/format";
import { StatusBadge, Miniatura, TipoBadge } from "@/components/ui";
import { BotoesMovimento } from "@/components/MovimentoForm";

export default async function EstoqueUnidade({ params }: { params: Promise<{ unidade: string }> }) {
  const { unidade } = await params;
  const { perfil } = await getSessao();
  const unidades = await getUnidades();
  const u = unidades.find((x) => x.codigo.toLowerCase() === unidade.toLowerCase());
  if (!u) notFound();
  const supabase = await createClient();
  const [saldos, movs, { data: locs }] = await Promise.all([getSaldosProduto(), getMovimentacoes({ unidade: u.id, limite: 15 }), supabase.from("saldos").select("produto_id, localizacao").eq("unidade_id", u.id)]);
  const locMap = new Map((locs ?? []).map((l) => [l.produto_id, l.localizacao]));
  const linhas = saldos.filter((s) => s.ativo).map((s) => ({ ...s, qtd: s.por_unidade?.[u.codigo] ?? 0, min: s.minimo_por_unidade?.[u.codigo] ?? 0, loc: locMap.get(s.produto_id) ?? null }));
  const total = linhas.reduce((a, l) => a + l.qtd, 0);
  const statusLocal = (l: typeof linhas[number]) => (l.qtd === 0 ? "ESGOTADO" : l.min > 0 && l.qtd <= l.min ? "BAIXO" : "NORMAL") as "ESGOTADO" | "BAIXO" | "NORMAL";
  const opcoes = saldos.map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, por_unidade: s.por_unidade }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-navy">Estoque {u.nome}</h1><p className="text-muted">{num(total)} itens em {linhas.filter((l) => l.qtd > 0).length} produtos</p></div>
        <BotoesMovimento produtos={opcoes} unidades={unidades} papel={perfil!.papel} unidadeFixa={u.id} compacto />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card scroll-x lg:col-span-2">
          <table className="tbl">
            <thead><tr><th></th><th>Produto</th><th className="num">Quantidade</th><th className="num">Mínimo</th><th>Localização</th><th>Status</th></tr></thead>
            <tbody>{linhas.map((l) => (
              <tr key={l.produto_id}>
                <td><Miniatura url={l.foto_principal_url} nome={l.nome} tamanho={32} /></td>
                <td><Link href={`/produtos/${l.produto_id}`} className="font-semibold text-navy hover:underline">{l.nome}</Link><div className="text-xs text-muted font-mono">{l.sku}</div></td>
                <td className="num font-bold text-lg">{num(l.qtd)}</td>
                <td className="num text-muted">{l.min || "—"}</td>
                <td className="text-muted">{l.loc || "—"}</td>
                <td><StatusBadge status={statusLocal(l)} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card p-4">
          <h2 className="font-bold text-navy mb-3">Últimas movimentações em {u.nome}</h2>
          <ul className="space-y-2 text-sm">{movs.map((m) => (
            <li key={m.id} className="flex justify-between gap-2 border-b border-line pb-2"><span><TipoBadge tipo={m.tipo} /> <b>{m.produtos?.nome}</b><div className="text-xs text-muted">{dataBr(m.data_movimento)} · {m.destino ?? m.motivo ?? ""}</div></span><span className="font-bold">{num(m.quantidade)}</span></li>
          ))}</ul>
          <Link href={`/movimentacoes?unidade=${u.id}`} className="text-sm text-gold font-semibold mt-3 inline-block">Ver histórico completo</Link>
        </div>
      </div>
    </div>
  );
}
