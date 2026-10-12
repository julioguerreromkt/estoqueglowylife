"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Fornecedor, Papel } from "@/lib/types";
import { podeMovimentar } from "@/lib/types";
import { salvarFornecedor } from "@/app/actions/cadastros";
import { Modal, Aviso, useAviso } from "@/components/ui";

export default function Fornecedores({ lista, papel }: { lista: Fornecedor[]; papel: Papel }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const [edit, setEdit] = useState<Fornecedor | null | "novo">(null);
  const f = edit === "novo" ? null : edit;
  function enviar(fd: FormData) {
    start(async () => { const r = await salvarFornecedor(fd); setAviso(r.ok ? { tipo: "ok", msg: "Fornecedor salvo" } : { tipo: "erro", msg: r.erro }); if (r.ok) { setEdit(null); router.refresh(); } });
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">{aviso ? <Aviso tipo={aviso.tipo} msg={aviso.msg} /> : <span />}{podeMovimentar(papel) && <button className="btn btn-gold" onClick={() => setEdit("novo")}>+ Novo fornecedor</button>}</div>
      <div className="card scroll-x"><table className="tbl">
        <thead><tr><th>Nome</th><th>CNPJ</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th>Status</th><th></th></tr></thead>
        <tbody>{lista.map((x) => (
          <tr key={x.id}><td className="font-semibold">{x.nome}</td><td>{x.cnpj}</td><td>{x.contato}</td><td>{x.telefone}</td><td>{x.email}</td><td><span className={`badge ${x.ativo ? "badge-normal" : "badge-neutro"}`}>{x.ativo ? "Ativo" : "Inativo"}</span></td><td>{podeMovimentar(papel) && <button className="btn btn-outline btn-sm" onClick={() => setEdit(x)}>Editar</button>}</td></tr>
        ))}{lista.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-6">Nenhum fornecedor cadastrado. A planilha original não tinha essa informação.</td></tr>}</tbody>
      </table></div>
      <Modal aberto={edit !== null} onFechar={() => setEdit(null)} titulo={f ? "Editar fornecedor" : "Novo fornecedor"}>
        <form action={enviar} className="space-y-3">
          {f && <input type="hidden" name="id" value={f.id} />}
          <div><label className="label">Nome *</label><input name="nome" required className="input" defaultValue={f?.nome ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">CNPJ</label><input name="cnpj" className="input" defaultValue={f?.cnpj ?? ""} /></div>
            <div><label className="label">Contato</label><input name="contato" className="input" defaultValue={f?.contato ?? ""} /></div>
            <div><label className="label">Telefone</label><input name="telefone" className="input" defaultValue={f?.telefone ?? ""} /></div>
            <div><label className="label">E-mail</label><input name="email" type="email" className="input" defaultValue={f?.email ?? ""} /></div>
          </div>
          <div><label className="label">Observações</label><textarea name="observacoes" className="input" rows={2} defaultValue={f?.observacoes ?? ""} /></div>
          <div><label className="label">Status</label><select name="ativo" className="input" defaultValue={String(f?.ativo ?? true)}><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" disabled={pending}>Salvar</button></div>
        </form>
      </Modal>
    </div>
  );
}
