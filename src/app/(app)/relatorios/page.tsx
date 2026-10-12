import { getSaldosProduto, getSessao, getUnidades } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { brl, num, dataBr } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import Link from "next/link";

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias: d } = await searchParams;
  const dias = Number(d ?? 30);
  await getSessao();
  const supabase = await createClient();
  const de = new Date(); de.setDate(de.getDate() - dias);
  const deS = de.toISOString().slice(0, 10);
  const [saldos, unidades, { data: movs }] = await Promise.all([
    getSaldosProduto(), getUnidades(),
    supabase.from("movimentacoes").select("produto_id, tipo, quantidade, data_movimento, unidade_id").gte("data_movimento", deS),
  ]);
  const ativas = unidades.filter((u) => u.ativa);
  const saidaPorProd = new Map<string, number>(); const ultimaSaida = new Map<string, string>();
  const porUnidade = new Map<string, { ent: number; sai: number }>();
  (movs ?? []).forEach((m) => {
    const u = porUnidade.get(m.unidade_id) ?? { ent: 0, sai: 0 };
    if (m.tipo === "ENTRADA" || m.tipo === "TRANSF_ENTRADA") u.ent += m.quantidade;
    if (m.tipo === "SAIDA" || m.tipo === "TRANSF_SAIDA" || m.tipo === "DANIFICADO") { u.sai += m.quantidade; saidaPorProd.set(m.produto_id, (saidaPorProd.get(m.produto_id) ?? 0) + m.quantidade); if ((ultimaSaida.get(m.produto_id) ?? "") < m.data_movimento) ultimaSaida.set(m.produto_id, m.data_movimento); }
    porUnidade.set(m.unidade_id, u);
  });
  const parados = saldos.filter((s) => s.ativo && s.total > 0 && !saidaPorProd.has(s.produto_id));
  const giro = saldos.filter((s) => s.ativo).map((s) => ({ ...s, saidas: saidaPorProd.get(s.produto_id) ?? 0 })).sort((a, b) => b.saidas - a.saidas);
  const valorTotal = saldos.reduce((a, s) => a + (s.custo_unitario ?? 0) * s.total, 0);
  const valorVenda = saldos.reduce((a, s) => a + (s.preco_venda ?? 0) * s.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-navy">Relatórios</h1><p className="text-muted">Exportáveis em Excel e CSV</p></div>
        <form method="get" className="flex gap-2 items-end"><div><label className="label">Período</label><select name="dias" defaultValue={String(dias)} className="input"><option value="7">7 dias</option><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option><option value="180">180 dias</option></select></div><button className="btn btn-outline">Aplicar</button></form>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Posição de estoque</div><p className="text-sm text-muted mt-1">Saldo por produto e unidade, mínimos, custo e valor.</p><div className="flex gap-2 mt-3"><a href="/api/exportar?tipo=estoque&formato=xlsx" className="btn btn-primary btn-sm">Excel</a><a href="/api/exportar?tipo=estoque&formato=csv" className="btn btn-outline btn-sm">CSV</a></div></div>
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Movimentações do período</div><p className="text-sm text-muted mt-1">Últimos {dias} dias, todas as unidades.</p><div className="flex gap-2 mt-3"><a href={`/api/exportar?tipo=movimentacoes&formato=xlsx&de=${deS}`} className="btn btn-primary btn-sm">Excel</a><a href={`/api/exportar?tipo=movimentacoes&formato=csv&de=${deS}`} className="btn btn-outline btn-sm">CSV</a><Link href="/movimentacoes" className="btn btn-outline btn-sm">Filtrar na tela</Link></div></div>
        <div className="card p-4"><div className="text-xs text-muted font-semibold uppercase">Produtos parados</div><p className="text-sm text-muted mt-1">Com estoque e sem saída há {dias} dias: <b className="text-navy">{parados.length}</b>.</p><div className="flex gap-2 mt-3"><a href={`/api/exportar?tipo=parados&formato=xlsx&dias=${dias}`} className="btn btn-primary btn-sm">Excel</a><a href={`/api/exportar?tipo=parados&formato=csv&dias=${dias}`} className="btn btn-outline btn-sm">CSV</a></div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-bold text-navy mb-3">Resumo por unidade ({dias} dias)</h2>
          <table className="tbl"><thead><tr><th>Unidade</th><th className="num">Estoque atual</th><th className="num">Entradas</th><th className="num">Saídas</th></tr></thead>
            <tbody>{ativas.map((u) => { const r = porUnidade.get(u.id) ?? { ent: 0, sai: 0 }; const est = saldos.reduce((a, s) => a + (s.por_unidade?.[u.codigo] ?? 0), 0); return <tr key={u.id}><td className="font-semibold">{u.nome}</td><td className="num">{num(est)}</td><td className="num text-green">{num(r.ent)}</td><td className="num text-amber">{num(r.sai)}</td></tr>; })}</tbody></table>
          <div className="mt-4 text-sm text-muted">Valor em estoque a custo: <b className="text-navy">{brl(valorTotal)}</b> · a preço de venda: <b className="text-navy">{brl(valorVenda)}</b>{valorTotal === 0 && " (cadastre custo e preço na ficha dos produtos)"}</div>
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-navy mb-3">Giro por produto ({dias} dias)</h2>
          <div className="scroll-x max-h-96 overflow-y-auto"><table className="tbl"><thead><tr><th>Produto</th><th className="num">Saídas</th><th className="num">Estoque</th><th className="num">Cobertura</th><th>Status</th></tr></thead>
            <tbody>{giro.map((g) => { const porDia = g.saidas / dias; const cob = porDia > 0 ? Math.round(g.total / porDia) : null; return (
              <tr key={g.produto_id}><td><Link href={`/produtos/${g.produto_id}`} className="font-semibold text-navy hover:underline">{g.nome}</Link></td><td className="num">{num(g.saidas)}</td><td className="num">{num(g.total)}</td><td className="num text-muted">{cob === null ? "—" : `${cob} dias`}</td><td><StatusBadge status={g.status_estoque} /></td></tr>
            ); })}</tbody></table></div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-navy mb-3">Produtos parados há {dias} dias</h2>
        {parados.length === 0 ? <p className="text-muted text-sm">Todos os produtos com estoque tiveram saída no período.</p> : (
          <table className="tbl"><thead><tr><th>Produto</th><th className="num">Estoque</th><th>Última saída</th></tr></thead>
            <tbody>{parados.map((p) => <tr key={p.produto_id}><td className="font-semibold">{p.nome}</td><td className="num">{num(p.total)}</td><td className="text-muted">{ultimaSaida.get(p.produto_id) ? dataBr(ultimaSaida.get(p.produto_id)) : `antes de ${dataBr(deS)}`}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}
