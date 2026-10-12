"use client";

import { useState, useTransition } from "react";
import { registrarMovimentacao, criarTransferencia } from "@/app/actions/estoque";
import { Modal, Aviso, useAviso } from "@/components/ui";
import type { Unidade, Papel } from "@/lib/types";
import { podeAjustar, podeMovimentar } from "@/lib/types";
import { useRouter } from "next/navigation";

export interface ProdutoOpcao { id: string; nome: string; sku: string; por_unidade?: Record<string, number> | null }

type Modo = "ENTRADA" | "SAIDA" | "AJUSTE" | "DANIFICADO" | "TRANSFERENCIA";

export function BotoesMovimento({ produtos, unidades, papel, produtoFixo, unidadeFixa, compacto }: {
  produtos: ProdutoOpcao[]; unidades: Unidade[]; papel: Papel; produtoFixo?: string; unidadeFixa?: string; compacto?: boolean;
}) {
  const [modo, setModo] = useState<Modo | null>(null);
  if (!podeMovimentar(papel)) return null;
  const cls = compacto ? "btn btn-sm" : "btn";
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className={`${cls} btn-green`} onClick={() => setModo("ENTRADA")}>+ Entrada</button>
        <button className={`${cls} btn-gold`} onClick={() => setModo("SAIDA")}>− Saída</button>
        {unidades.filter((u) => u.ativa).length > 1 && <button className={`${cls} btn-primary`} onClick={() => setModo("TRANSFERENCIA")}>⇄ Transferência</button>}
        {podeAjustar(papel) && <button className={`${cls} btn-outline`} onClick={() => setModo("AJUSTE")}>Ajuste</button>}
        {!compacto && <button className={`${cls} btn-outline`} onClick={() => setModo("DANIFICADO")}>Danificado</button>}
      </div>
      <MovimentoModal modo={modo} onFechar={() => setModo(null)} produtos={produtos} unidades={unidades} produtoFixo={produtoFixo} unidadeFixa={unidadeFixa} />
    </>
  );
}

const TITULO: Record<Modo, string> = { ENTRADA: "Registrar entrada", SAIDA: "Registrar saída", AJUSTE: "Ajuste de inventário", DANIFICADO: "Registrar produto danificado", TRANSFERENCIA: "Transferir entre unidades" };

export function MovimentoModal({ modo, onFechar, produtos, unidades, produtoFixo, unidadeFixa }: {
  modo: Modo | null; onFechar: () => void; produtos: ProdutoOpcao[]; unidades: Unidade[]; produtoFixo?: string; unidadeFixa?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const [produtoId, setProdutoId] = useState(produtoFixo ?? "");
  const [unidadeId, setUnidadeId] = useState(unidadeFixa ?? unidades[0]?.id ?? "");
  const ativas = unidades.filter((u) => u.ativa);
  const prod = produtos.find((p) => p.id === (produtoId || produtoFixo));
  const uni = unidades.find((u) => u.id === unidadeId);
  const saldoAtual = prod && uni ? prod.por_unidade?.[uni.codigo] ?? 0 : null;
  const hoje = new Date().toISOString().slice(0, 10);

  function enviar(fd: FormData) {
    start(async () => {
      const r = modo === "TRANSFERENCIA" ? await criarTransferencia(fd) : await registrarMovimentacao(fd);
      if (r.ok) { setAviso({ tipo: "ok", msg: r.msg ?? "Registrado" }); router.refresh(); setTimeout(onFechar, 600); }
      else setAviso({ tipo: "erro", msg: r.erro });
    });
  }

  return (
    <Modal aberto={modo !== null} onFechar={onFechar} titulo={modo ? TITULO[modo] : ""}>
      {modo && (
        <form action={enviar} className="space-y-3">
          <input type="hidden" name="tipo" value={modo} />
          <div>
            <label className="label">Produto</label>
            <select name="produto_id" required className="input" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} disabled={!!produtoFixo}>
              <option value="">Selecione</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
            </select>
            {produtoFixo && <input type="hidden" name="produto_id" value={produtoFixo} />}
          </div>
          {modo === "TRANSFERENCIA" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">De (origem)</label>
                <select name="origem_id" required className="input" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>{ativas.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
              <div><label className="label">Para (destino)</label>
                <select name="destino_id" required className="input" defaultValue={ativas.find((u) => u.id !== unidadeId)?.id}>{ativas.filter((u) => u.id !== unidadeId).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
            </div>
          ) : (
            <div><label className="label">{modo === "ENTRADA" ? "Unidade de destino" : "Unidade"}</label>
              <select name="unidade_id" required className="input" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>{ativas.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          )}
          {saldoAtual !== null && <p className="text-sm text-muted">Saldo atual em {uni?.nome}: <b className="text-navy">{saldoAtual}</b></p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">{modo === "AJUSTE" ? "Quantidade física contada" : "Quantidade"}</label>
              <input name="quantidade" type="number" min={0} step={1} required className="input" autoFocus /></div>
            {modo !== "TRANSFERENCIA" && <div><label className="label">Data</label><input name="data_movimento" type="date" defaultValue={hoje} max={hoje} className="input" /></div>}
          </div>
          {modo === "SAIDA" && (<>
            <div><label className="label">Motivo</label>
              <select name="motivo" className="input" defaultValue="Venda / pedido"><option>Venda / pedido</option><option>Uso interno</option><option>Brinde / sorteio</option><option>Amostra</option><option>Devolução ao fornecedor</option><option>Outro</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Destino (cliente, consultor, local)</label><input name="destino" className="input" placeholder="Ex.: Mônica - Aracaju" /></div>
              <div><label className="label">Nº do pedido / referência</label><input name="referencia" className="input" /></div>
            </div>
          </>)}
          {modo === "ENTRADA" && (<div className="grid grid-cols-2 gap-3">
            <div><label className="label">Origem (fornecedor, NF)</label><input name="destino" className="input" placeholder="Ex.: Fábrica, NF 1234" /></div>
            <div><label className="label">Referência</label><input name="referencia" className="input" /></div>
          </div>)}
          {modo === "DANIFICADO" && <div><label className="label">Motivo</label><input name="motivo" className="input" placeholder="Ex.: embalagem violada no transporte" required /></div>}
          {modo === "AJUSTE" && <div><label className="label">Justificativa (obrigatória)</label><textarea name="justificativa" className="input" rows={2} required placeholder="Ex.: contagem física de 12/10, divergência por saída não lançada" /></div>}
          <div><label className="label">Observações</label><input name="observacoes" className="input" /></div>
          {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-outline" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Gravando..." : "Confirmar"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
