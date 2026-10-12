"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Transferencia, Papel, Unidade } from "@/lib/types";
import { podeAjustar, podeMovimentar } from "@/lib/types";
import { receberTransferencia, cancelarTransferencia } from "@/app/actions/estoque";
import { dataHoraBr, num } from "@/lib/format";
import { Modal, Aviso, useAviso } from "@/components/ui";
import { MovimentoModal, type ProdutoOpcao } from "@/components/MovimentoForm";

const STATUS: Record<string, { txt: string; cls: string }> = {
  ENVIADA: { txt: "Enviada", cls: "badge-baixo" }, EM_TRANSITO: { txt: "Em trânsito", cls: "badge-azul" }, RECEBIDA: { txt: "Recebida", cls: "badge-normal" }, CANCELADA: { txt: "Cancelada", cls: "badge-neutro" },
};

export default function Transferencias({ lista, papel, produtos, unidades }: { lista: Transferencia[]; papel: Papel; produtos: ProdutoOpcao[]; unidades: Unidade[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const [receber, setReceber] = useState<Transferencia | null>(null);
  const [nova, setNova] = useState(false);
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");

  function confirmarRecebimento() {
    if (!receber) return;
    start(async () => {
      const r = await receberTransferencia(receber.id, qtd ? Number(qtd) : null, obs || null);
      setAviso(r.ok ? { tipo: "ok", msg: r.msg ?? "" } : { tipo: "erro", msg: r.erro });
      if (r.ok) { setReceber(null); setQtd(""); setObs(""); router.refresh(); }
    });
  }
  function cancelar(t: Transferencia) {
    const motivo = window.prompt("Motivo do cancelamento (a quantidade volta para a origem):");
    if (!motivo) return;
    start(async () => { const r = await cancelarTransferencia(t.id, motivo); setAviso(r.ok ? { tipo: "ok", msg: r.msg ?? "" } : { tipo: "erro", msg: r.erro }); router.refresh(); });
  }
  const pendentes = lista.filter((t) => t.status === "EM_TRANSITO" || t.status === "ENVIADA");
  const historico = lista.filter((t) => t.status === "RECEBIDA" || t.status === "CANCELADA");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-muted text-sm">Etapas: <b>enviada</b> (sai da origem) → <b>em trânsito</b> (fora dos dois saldos) → <b>recebida</b> (entra no destino). Nada é contado duas vezes.</p>
        {podeMovimentar(papel) && <button className="btn btn-primary" onClick={() => setNova(true)}>⇄ Nova transferência</button>}
      </div>
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="card">
        <div className="px-5 py-3 border-b border-line font-bold text-navy">Em trânsito ({pendentes.length})</div>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>Enviada em</th><th>Produto</th><th>Origem</th><th>Destino</th><th className="num">Qtd</th><th>Status</th><th>Obs.</th><th>Ações</th></tr></thead>
          <tbody>{pendentes.map((t) => (
            <tr key={t.id}><td>{dataHoraBr(t.enviada_em)}</td><td className="font-semibold">{t.produtos?.nome}</td><td>{t.origem?.nome}</td><td>{t.destino?.nome}</td><td className="num font-bold">{num(t.quantidade)}</td><td><span className={`badge ${STATUS[t.status].cls}`}>{STATUS[t.status].txt}</span></td><td className="text-muted">{t.observacoes}</td>
              <td className="whitespace-nowrap">{podeMovimentar(papel) && <button className="btn btn-green btn-sm mr-1" onClick={() => { setReceber(t); setQtd(String(t.quantidade)); }}>Confirmar recebimento</button>}{podeAjustar(papel) && <button className="btn btn-danger btn-sm" onClick={() => cancelar(t)} disabled={pending}>Cancelar</button>}</td></tr>
          ))}{pendentes.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-6">Nenhuma transferência pendente.</td></tr>}</tbody>
        </table></div>
      </div>
      <div className="card">
        <div className="px-5 py-3 border-b border-line font-bold text-navy">Histórico</div>
        <div className="scroll-x"><table className="tbl">
          <thead><tr><th>Enviada em</th><th>Recebida em</th><th>Produto</th><th>Origem</th><th>Destino</th><th className="num">Qtd</th><th>Status</th><th>Obs.</th></tr></thead>
          <tbody>{historico.map((t) => (
            <tr key={t.id}><td>{dataHoraBr(t.enviada_em)}</td><td>{dataHoraBr(t.recebida_em)}</td><td className="font-semibold">{t.produtos?.nome}</td><td>{t.origem?.nome}</td><td>{t.destino?.nome}</td><td className="num">{num(t.quantidade)}</td><td><span className={`badge ${STATUS[t.status].cls}`}>{STATUS[t.status].txt}</span></td><td className="text-muted">{t.observacoes}</td></tr>
          ))}{historico.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-6">Sem histórico ainda. As remessas antigas da planilha estão em Movimentações como saída na Sede e entrada em Aracaju.</td></tr>}</tbody>
        </table></div>
      </div>
      <Modal aberto={!!receber} onFechar={() => setReceber(null)} titulo="Confirmar recebimento">
        {receber && (<div className="space-y-3">
          <p><b>{receber.produtos?.nome}</b>: {num(receber.quantidade)} unidade(s) de {receber.origem?.nome} para {receber.destino?.nome}.</p>
          <div><label className="label">Quantidade recebida</label><input type="number" min={0} max={receber.quantidade} className="input" value={qtd} onChange={(e) => setQtd(e.target.value)} /><p className="text-xs text-muted mt-1">Se receber menos do que foi enviado, uma pendência de inventário é aberta automaticamente.</p></div>
          <div><label className="label">Observações</label><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div className="flex justify-end gap-2"><button className="btn btn-outline" onClick={() => setReceber(null)}>Voltar</button><button className="btn btn-green" onClick={confirmarRecebimento} disabled={pending}>{pending ? "Gravando..." : "Confirmar"}</button></div>
        </div>)}
      </Modal>
      <MovimentoModal modo={nova ? "TRANSFERENCIA" : null} onFechar={() => setNova(false)} produtos={produtos} unidades={unidades} />
    </div>
  );
}
