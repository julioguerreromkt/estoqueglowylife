"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Pendencia, Papel, Unidade, SaldoProduto } from "@/lib/types";
import { podeAjustar } from "@/lib/types";
import { aplicarInventario, resolverPendencia } from "@/app/actions/estoque";
import { Aviso, useAviso } from "@/components/ui";
import { dataHoraBr, num } from "@/lib/format";

export default function Inventario({ pendencias, saldos, unidades, papel }: { pendencias: Pendencia[]; saldos: SaldoProduto[]; unidades: Unidade[]; papel: Papel }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const ativas = unidades.filter((u) => u.ativa);
  const [unidadeId, setUnidadeId] = useState(ativas[0]?.id ?? "");
  const [contagens, setContagens] = useState<Record<string, string>>({});
  const [just, setJust] = useState("");
  const u = ativas.find((x) => x.id === unidadeId);
  const linhas = saldos.filter((s) => s.ativo).map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, sistema: s.por_unidade?.[u?.codigo ?? ""] ?? 0 }));
  const divergencias = linhas.filter((l) => contagens[l.id] !== undefined && contagens[l.id] !== "" && Number(contagens[l.id]) !== l.sistema);

  function aplicar() {
    const lista = linhas.filter((l) => contagens[l.id] !== undefined && contagens[l.id] !== "").map((l) => ({ produto_id: l.id, contado: Number(contagens[l.id]) }));
    if (!lista.length) { setAviso({ tipo: "erro", msg: "Preencha ao menos uma contagem" }); return; }
    if (!window.confirm(`Aplicar ${divergencias.length} ajuste(s) em ${u?.nome}? Cada ajuste fica no histórico com a justificativa.`)) return;
    start(async () => {
      const r = await aplicarInventario(unidadeId, lista, just);
      setAviso(r.ok ? { tipo: "ok", msg: r.msg ?? "" } : { tipo: "erro", msg: r.erro });
      if (r.ok) { setContagens({}); router.refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="card">
        <div className="px-5 py-3 border-b border-line font-bold text-navy">Pendências de inventário</div>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>Aberta em</th><th>Produto</th><th>Unidade</th><th className="num">Divergência</th><th>Descrição</th><th>Status</th><th></th></tr></thead>
          <tbody>{pendencias.map((p) => (
            <tr key={p.id}><td>{dataHoraBr(p.criado_em)}</td><td className="font-semibold">{p.produtos?.nome}</td><td>{p.unidades?.nome}</td><td className="num font-bold text-red">{p.quantidade_divergente > 0 ? "+" : ""}{p.quantidade_divergente}</td><td className="text-sm">{p.descricao}</td><td><span className={`badge ${p.status === "ABERTA" ? "badge-baixo" : "badge-normal"}`}>{p.status === "ABERTA" ? "Aberta" : "Resolvida"}</span></td>
              <td>{p.status === "ABERTA" && podeAjustar(papel) && <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { await resolverPendencia(p.id); router.refresh(); })}>Marcar resolvida</button>}</td></tr>
          ))}{pendencias.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-6">Nenhuma pendência.</td></tr>}</tbody>
        </table></div>
      </div>

      {podeAjustar(papel) ? (
        <div className="card p-5 space-y-3">
          <div className="flex flex-wrap justify-between items-end gap-3">
            <div><h2 className="font-bold text-navy">Contagem física por unidade</h2><p className="text-sm text-muted">Digite a quantidade contada. Só as linhas preenchidas e diferentes do sistema viram ajuste.</p></div>
            <div><label className="label">Unidade</label><select className="input" value={unidadeId} onChange={(e) => { setUnidadeId(e.target.value); setContagens({}); }}>{ativas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          </div>
          <div className="scroll-x"><table className="tbl">
            <thead><tr><th>Produto</th><th className="num">Sistema</th><th className="num">Contado</th><th className="num">Diferença</th></tr></thead>
            <tbody>{linhas.map((l) => { const c = contagens[l.id]; const dif = c === undefined || c === "" ? null : Number(c) - l.sistema; return (
              <tr key={l.id}><td><b>{l.nome}</b> <span className="text-xs text-muted font-mono">{l.sku}</span></td><td className="num">{num(l.sistema)}</td>
                <td className="num"><input type="number" min={0} className="input w-24 text-right" value={c ?? ""} onChange={(e) => setContagens({ ...contagens, [l.id]: e.target.value })} /></td>
                <td className={`num font-bold ${dif === null ? "text-muted" : dif === 0 ? "text-green" : "text-red"}`}>{dif === null ? "—" : dif > 0 ? `+${dif}` : dif}</td></tr>
            ); })}</tbody>
          </table></div>
          <div><label className="label">Justificativa do inventário (obrigatória)</label><input className="input" value={just} onChange={(e) => setJust(e.target.value)} placeholder="Ex.: contagem física mensal de outubro, conferida por Mônica" /></div>
          <div className="flex justify-end"><button className="btn btn-primary" onClick={aplicar} disabled={pending || !divergencias.length}>{pending ? "Aplicando..." : `Aplicar ${divergencias.length} ajuste(s)`}</button></div>
        </div>
      ) : <p className="text-muted text-sm">Contagem física e ajustes exigem perfil Gestor ou Administrador.</p>}
    </div>
  );
}
