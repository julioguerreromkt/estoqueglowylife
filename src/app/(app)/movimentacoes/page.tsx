import { getMovimentacoes, getSaldosProduto, getSessao, getUnidades } from "@/lib/data";
import { dataBr, num, diasAtras, hoje } from "@/lib/format";
import { TipoBadge } from "@/components/ui";
import { BotoesMovimento } from "@/components/MovimentoForm";
import { TIPO_LABEL } from "@/lib/types";
import Link from "next/link";

type SP = { de?: string; ate?: string; produto?: string; unidade?: string; tipo?: string; busca?: string };

export default async function MovimentacoesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { perfil } = await getSessao();
  const f = { de: sp.de || diasAtras(30), ate: sp.ate || hoje(), produto: sp.produto, unidade: sp.unidade, tipo: sp.tipo, busca: sp.busca };
  const [movs, saldos, unidades] = await Promise.all([getMovimentacoes(f), getSaldosProduto(), getUnidades()]);
  const opcoes = saldos.map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, por_unidade: s.por_unidade }));
  const qs = new URLSearchParams(Object.entries({ ...f, tipo_mov: f.tipo, tipo: undefined }).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-navy">Movimentações</h1><p className="text-muted">Histórico auditável de entradas, saídas, ajustes e transferências</p></div>
        <BotoesMovimento produtos={opcoes} unidades={unidades} papel={perfil!.papel} />
      </div>
      <form className="card p-3 flex flex-wrap gap-2 items-end" method="get">
        <div><label className="label">De</label><input type="date" name="de" defaultValue={f.de} className="input" /></div>
        <div><label className="label">Até</label><input type="date" name="ate" defaultValue={f.ate} className="input" /></div>
        <div><label className="label">Produto</label><select name="produto" defaultValue={f.produto ?? ""} className="input"><option value="">Todos</option>{saldos.map((p) => <option key={p.produto_id} value={p.produto_id}>{p.nome}</option>)}</select></div>
        <div><label className="label">Unidade</label><select name="unidade" defaultValue={f.unidade ?? ""} className="input"><option value="">Todas</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
        <div><label className="label">Tipo</label><select name="tipo" defaultValue={f.tipo ?? ""} className="input"><option value="">Todos</option>{Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Destino / referência</label><input name="busca" defaultValue={f.busca ?? ""} className="input" placeholder="Ex.: Mônica, 9011" /></div>
        <button className="btn btn-primary">Filtrar</button>
        <a href={`/api/exportar?tipo=movimentacoes&formato=xlsx&${qs}`} className="btn btn-outline">Exportar Excel</a>
        <a href={`/api/exportar?tipo=movimentacoes&formato=csv&${qs}`} className="btn btn-outline">CSV</a>
      </form>
      <div className="card scroll-x">
        <table className="tbl">
          <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Unidade</th><th className="num">Anterior</th><th className="num">Qtd</th><th className="num">Saldo</th><th>Destino / motivo</th><th>Ref.</th><th>Observações</th></tr></thead>
          <tbody>{movs.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap">{dataBr(m.data_movimento)}{m.data_estimada && <span className="text-amber" title="data estimada"> *</span>}</td>
              <td><TipoBadge tipo={m.tipo} /></td>
              <td><Link href={`/produtos/${m.produto_id}`} className="font-semibold text-navy hover:underline">{m.produtos?.nome}</Link></td>
              <td>{m.unidades?.nome}</td>
              <td className="num text-muted">{num(m.saldo_anterior)}</td>
              <td className="num font-bold">{num(m.tipo === "AJUSTE" ? m.saldo_resultante : m.quantidade)}</td>
              <td className="num font-semibold">{num(m.saldo_resultante)}</td>
              <td>{m.destino ?? m.motivo ?? ""}{m.justificativa && <div className="text-xs text-muted">{m.justificativa}</div>}</td>
              <td className="text-muted">{m.referencia ?? ""}</td>
              <td className="text-muted">{m.observacoes ?? ""}{m.importado && <span className="badge badge-neutro ml-1">planilha</span>}</td>
            </tr>
          ))}
          {movs.length === 0 && <tr><td colSpan={10} className="text-center text-muted py-8">Nenhuma movimentação no filtro.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{movs.length} registro(s){movs.length >= 500 ? " (limite de 500 por consulta; refine o período)" : ""}. * data estimada na importação da planilha.</p>
    </div>
  );
}
