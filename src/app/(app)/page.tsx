import Link from "next/link";
import { getDashboard, getSessao, getCategorias } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { brl, num, dataBr } from "@/lib/format";
import { TIPO_LABEL } from "@/lib/types";
import { GraficoUnidades, GraficoCategorias, GraficoHistorico, GraficoBarrasH } from "@/components/Graficos";
import { StatusBadge, TipoBadge } from "@/components/ui";
import { Package, Boxes, AlertTriangle, XCircle, Repeat, DollarSign } from "lucide-react";

type SP = { dias?: string; unidade?: string; categoria?: string; produto?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dias = Number(sp.dias || 30);
  await getSessao();
  const d = await getDashboard();
  const categorias = await getCategorias();
  const supabase = await createClient();

  // filtros
  const de = new Date(); de.setDate(de.getDate() - dias);
  let q = supabase.from("movimentacoes").select("tipo, quantidade, data_movimento, produto_id, unidade_id, produtos(nome)").gte("data_movimento", de.toISOString().slice(0, 10));
  if (sp.unidade) q = q.eq("unidade_id", sp.unidade);
  if (sp.produto) q = q.eq("produto_id", sp.produto);
  const { data: movsF } = await q;
  const movs = (movsF ?? []) as unknown as { tipo: string; quantidade: number; data_movimento: string; produto_id: string; unidade_id: string; produtos: { nome: string } | null }[];

  const saldos = sp.categoria ? d.saldos.filter((s) => s.categoria_id === sp.categoria) : d.saldos;
  const unidadesAtivas = d.unidades.filter((u) => u.ativa);
  const totalItens = saldos.reduce((a, s) => a + s.total, 0);
  const porUnidade = unidadesAtivas.map((u) => ({ nome: u.nome, codigo: u.codigo, quantidade: saldos.reduce((a, s) => a + (s.por_unidade?.[u.codigo] ?? 0), 0) }));
  const baixo = saldos.filter((s) => s.status_estoque === "BAIXO");
  const esgotado = saldos.filter((s) => s.status_estoque === "ESGOTADO" && s.ativo);
  const valor = saldos.reduce((a, s) => a + (s.custo_unitario ?? 0) * s.total, 0);
  const comCusto = saldos.filter((s) => s.custo_unitario).length;

  const catMap = new Map<string, number>();
  saldos.forEach((s) => { if (s.categoria) catMap.set(s.categoria, (catMap.get(s.categoria) ?? 0) + s.total); });
  const porCategoria = [...catMap.entries()].map(([nome, quantidade]) => ({ nome, quantidade }));

  const porDia = new Map<string, { entradas: number; saidas: number }>();
  const movProd = new Map<string, number>();
  let entradas = 0, saidas = 0;
  movs.forEach((m) => {
    const k = m.data_movimento;
    if (!porDia.has(k)) porDia.set(k, { entradas: 0, saidas: 0 });
    const r = porDia.get(k)!;
    if (m.tipo === "ENTRADA" || m.tipo === "TRANSF_ENTRADA") { r.entradas += m.quantidade; entradas += m.quantidade; }
    if (m.tipo === "SAIDA" || m.tipo === "TRANSF_SAIDA" || m.tipo === "DANIFICADO") { r.saidas += m.quantidade; saidas += m.quantidade; }
    if (m.tipo !== "AJUSTE") movProd.set(m.produtos?.nome ?? m.produto_id, (movProd.get(m.produtos?.nome ?? m.produto_id) ?? 0) + m.quantidade);
  });
  const historico = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia: dataBr(dia).slice(0, 5), ...v }));
  const maisMovimentados = [...movProd.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, quantidade]) => ({ nome, quantidade }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-muted">Visão consolidada de {unidadesAtivas.map((u) => u.nome).join(" e ")}</p>
        </div>
        <form className="flex flex-wrap gap-2 items-end" method="get">
          <div><label className="label">Período</label>
            <select name="dias" defaultValue={String(dias)} className="input">
              <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">12 meses</option>
            </select></div>
          <div><label className="label">Local</label>
            <select name="unidade" defaultValue={sp.unidade ?? ""} className="input"><option value="">Todos</option>{unidadesAtivas.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          <div><label className="label">Categoria</label>
            <select name="categoria" defaultValue={sp.categoria ?? ""} className="input"><option value="">Todas</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label className="label">Produto</label>
            <select name="produto" defaultValue={sp.produto ?? ""} className="input"><option value="">Todos</option>{d.saldos.map((p) => <option key={p.produto_id} value={p.produto_id}>{p.nome}</option>)}</select></div>
          <button className="btn btn-outline">Filtrar</button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<Package />} rotulo="Produtos cadastrados" valor={num(saldos.filter((s) => s.ativo).length)} />
        <Kpi icon={<Boxes />} rotulo="Itens em estoque" valor={num(totalItens)} />
        {porUnidade.map((u) => <Kpi key={u.codigo} icon={<Boxes />} rotulo={`Estoque ${u.nome}`} valor={num(u.quantidade)} href={`/estoque/${u.codigo.toLowerCase()}`} />)}
        <Kpi icon={<AlertTriangle />} rotulo="Estoque baixo" valor={num(baixo.length)} cor={baixo.length ? "text-amber" : undefined} href="/produtos?status=BAIXO" />
        <Kpi icon={<XCircle />} rotulo="Sem estoque" valor={num(esgotado.length)} cor={esgotado.length ? "text-red" : undefined} href="/produtos?status=ESGOTADO" />
        <Kpi icon={<Repeat />} rotulo="Transferências em trânsito" valor={num(d.transferenciasPendentes.length)} href="/transferencias" />
        <Kpi icon={<DollarSign />} rotulo="Valor estimado (custo)" valor={comCusto ? brl(valor) : "Sem custos"} sub={comCusto ? `${comCusto} de ${saldos.length} produtos com custo` : "Cadastre o custo unitário na ficha"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5"><h2 className="font-bold text-navy mb-2">Distribuição por unidade</h2><GraficoUnidades dados={porUnidade} /></div>
        <div className="card p-5"><h2 className="font-bold text-navy mb-2">Distribuição por categoria</h2><GraficoCategorias dados={porCategoria} /></div>
        <div className="card p-5"><h2 className="font-bold text-navy mb-2">Mais movimentados ({dias} dias)</h2>{maisMovimentados.length ? <GraficoBarrasH dados={maisMovimentados} /> : <p className="text-muted text-sm">Sem movimentações no período.</p>}</div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
          <h2 className="font-bold text-navy">Histórico de movimentação ({dias} dias)</h2>
          <div className="text-sm text-muted">Entradas <b className="text-green">{num(entradas)}</b> · Saídas <b className="text-gold">{num(saidas)}</b></div>
        </div>
        {historico.length ? <GraficoHistorico dados={historico} /> : <p className="text-muted text-sm">Sem movimentações no período.</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-navy">Entradas e saídas recentes</h2><Link href="/movimentacoes" className="text-sm text-gold font-semibold">Ver todas</Link></div>
          <div className="scroll-x"><table className="tbl">
            <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Local</th><th className="num">Qtd</th><th>Destino / origem</th></tr></thead>
            <tbody>{d.recentes.map((m) => (
              <tr key={m.id}><td>{dataBr(m.data_movimento)}</td><td><TipoBadge tipo={m.tipo} /></td><td>{m.produtos?.nome}</td><td>{m.unidades?.nome}</td><td className="num font-semibold">{num(m.quantidade)}</td><td className="text-muted">{m.destino ?? m.motivo ?? ""}</td></tr>
            ))}</tbody></table></div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-navy">Transferências entre unidades</h2><Link href="/transferencias" className="text-sm text-gold font-semibold">Gerenciar</Link></div>
            {d.transferenciasPendentes.length === 0 ? <p className="text-muted text-sm">Nenhuma transferência em trânsito.</p> : (
              <ul className="space-y-2">{d.transferenciasPendentes.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-sm"><span><b>{t.produtos?.nome}</b> · {t.origem?.nome} → {t.destino?.nome}</span><span className="badge badge-azul">{num(t.quantidade)} em trânsito</span></li>
              ))}</ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-navy mb-3">Atenção</h2>
            <ul className="space-y-2 text-sm">
              {d.pendenciasAbertas > 0 && <li><Link href="/inventario" className="text-amber font-semibold">{d.pendenciasAbertas} pendência(s) de inventário aberta(s)</Link></li>}
              {esgotado.slice(0, 5).map((s) => <li key={s.produto_id} className="flex justify-between"><Link href={`/produtos/${s.produto_id}`}>{s.nome}</Link><StatusBadge status="ESGOTADO" /></li>)}
              {baixo.slice(0, 5).map((s) => <li key={s.produto_id} className="flex justify-between"><Link href={`/produtos/${s.produto_id}`}>{s.nome}</Link><StatusBadge status="BAIXO" /></li>)}
              {d.pendenciasAbertas === 0 && esgotado.length === 0 && baixo.length === 0 && <li className="text-muted">Nada pendente. Defina estoque mínimo por produto para receber alertas de estoque baixo.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, rotulo, valor, sub, cor, href }: { icon: React.ReactNode; rotulo: string; valor: string; sub?: string; cor?: string; href?: string }) {
  const inner = (
    <div className="card p-4 h-full">
      <div className="flex items-center gap-2 text-muted text-xs font-semibold uppercase tracking-wide"><span className="text-gold [&>svg]:w-4 [&>svg]:h-4">{icon}</span>{rotulo}</div>
      <div className={`kpi-valor mt-2 ${cor ?? ""}`}>{valor}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:-translate-y-0.5 transition">{inner}</Link> : inner;
}
