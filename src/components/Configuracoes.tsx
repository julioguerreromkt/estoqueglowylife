"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { Perfil, Unidade, Categoria, CampoPersonalizado } from "@/lib/types";
import { PAPEL_LABEL } from "@/lib/types";
import { criarUsuario, atualizarPerfil, redefinirSenhaUsuario, alterarMinhaSenha, salvarUnidade, salvarCategoria, excluirCategoria, salvarCampoPersonalizado, desativarCampoPersonalizado, importarProdutos, importarMovimentacoes, type LinhaImportProduto, type LinhaImportMov } from "@/app/actions/cadastros";
import { Modal, Aviso, useAviso } from "@/components/ui";

type Aba = "usuarios" | "unidades" | "categorias" | "campos" | "importar" | "conta";

export default function Configuracoes({ eu, perfis, unidades, categorias, campos }: { eu: Perfil; perfis: Perfil[]; unidades: Unidade[]; categorias: Categoria[]; campos: CampoPersonalizado[] }) {
  const admin = eu.papel === "admin";
  const [aba, setAba] = useState<Aba>(admin ? "usuarios" : "conta");
  const abas: [Aba, string][] = admin
    ? [["usuarios", "Usuários"], ["unidades", "Unidades"], ["categorias", "Categorias"], ["campos", "Campos personalizados"], ["importar", "Importar / Exportar"], ["conta", "Minha conta"]]
    : [["importar", "Importar / Exportar"], ["conta", "Minha conta"]];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-line">{abas.map(([k, v]) => <button key={k} className={`px-4 py-2 font-semibold text-sm border-b-2 -mb-px ${aba === k ? "border-gold text-navy" : "border-transparent text-muted"}`} onClick={() => setAba(k)}>{v}</button>)}</div>
      {aba === "usuarios" && admin && <Usuarios perfis={perfis} unidades={unidades} eu={eu} />}
      {aba === "unidades" && admin && <Unidades lista={unidades} />}
      {aba === "categorias" && admin && <Categorias lista={categorias} />}
      {aba === "campos" && admin && <Campos lista={campos} />}
      {aba === "importar" && <Importar />}
      {aba === "conta" && <MinhaConta eu={eu} />}
    </div>
  );
}

function useAcao() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const run = (fn: () => Promise<{ ok: true; msg?: string } | { ok: false; erro: string }>, depois?: () => void) =>
    start(async () => { const r = await fn(); setAviso(r.ok ? { tipo: "ok", msg: r.msg ?? "Salvo" } : { tipo: "erro", msg: r.erro }); if (r.ok) { depois?.(); router.refresh(); } });
  return { pending, run, aviso };
}

/** Transforma um handler de FormData em onSubmit sem o reset automático do formulário. */
function onSubmit(fn: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; fn(new FormData(form)); };
}

function Usuarios({ perfis, unidades, eu }: { perfis: Perfil[]; unidades: Unidade[]; eu: Perfil }) {
  const { pending, run, aviso } = useAcao();
  const [novo, setNovo] = useState(false);
  const [edit, setEdit] = useState<Perfil | null>(null);
  const ativas = unidades.filter((u) => u.ativa);
  return (
    <div className="space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="flex justify-between items-center"><p className="text-sm text-muted">Perfis: Administrador (tudo), Gestor (acompanha, ajusta e autoriza), Operador (cadastra e movimenta), Consulta (só visualiza). Restrinja por unidade quando o colaborador só atua em um local.</p><button className="btn btn-gold" onClick={() => setNovo(true)}>+ Novo usuário</button></div>
      <div className="card scroll-x"><table className="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Unidades</th><th>Status</th><th></th></tr></thead>
        <tbody>{perfis.map((p) => (
          <tr key={p.id}><td className="font-semibold">{p.nome}{p.id === eu.id && <span className="badge badge-neutro ml-2">você</span>}</td><td>{p.email}</td><td>{PAPEL_LABEL[p.papel]}</td><td>{p.unidades_permitidas ? p.unidades_permitidas.map((id) => unidades.find((u) => u.id === id)?.nome ?? "?").join(", ") : "Todas"}</td><td><span className={`badge ${p.ativo ? "badge-normal" : "badge-neutro"}`}>{p.ativo ? "Ativo" : "Inativo"}</span></td><td><button className="btn btn-outline btn-sm" onClick={() => setEdit(p)}>Editar</button></td></tr>
        ))}</tbody></table></div>
      <Modal aberto={novo} onFechar={() => setNovo(false)} titulo="Novo usuário">
        <form onSubmit={onSubmit((fd) => run(() => criarUsuario(fd), () => setNovo(false)))} className="space-y-3">
          <div><label className="label">Nome</label><input name="nome" required className="input" /></div>
          <div><label className="label">E-mail</label><input name="email" type="email" required className="input" /></div>
          <div><label className="label">Senha inicial (mín. 8 caracteres)</label><input name="senha" type="text" required minLength={8} className="input" /><p className="text-xs text-muted mt-1">Entregue ao colaborador e peça para trocar em "Minha conta".</p></div>
          <div><label className="label">Perfil</label><select name="papel" className="input" defaultValue="operador">{Object.entries(PAPEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <UnidadesCheck ativas={ativas} selecionadas={null} />
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-outline" onClick={() => setNovo(false)}>Cancelar</button><button className="btn btn-primary" disabled={pending}>Criar</button></div>
        </form>
      </Modal>
      <Modal aberto={!!edit} onFechar={() => setEdit(null)} titulo={`Editar ${edit?.nome ?? ""}`}>
        {edit && (<div className="space-y-4">
          <form onSubmit={onSubmit((fd) => run(() => atualizarPerfil(fd), () => setEdit(null)))} className="space-y-3">
            <input type="hidden" name="id" value={edit.id} />
            <div><label className="label">Nome</label><input name="nome" required className="input" defaultValue={edit.nome} /></div>
            <div><label className="label">Perfil</label><select name="papel" className="input" defaultValue={edit.papel}>{Object.entries(PAPEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <UnidadesCheck ativas={ativas} selecionadas={edit.unidades_permitidas} />
            <div><label className="label">Status</label><select name="ativo" className="input" defaultValue={String(edit.ativo)}><option value="true">Ativo</option><option value="false">Inativo (bloqueia o acesso)</option></select></div>
            <div className="flex justify-end"><button className="btn btn-primary" disabled={pending}>Salvar</button></div>
          </form>
          <div className="border-t border-line pt-3">
            <label className="label">Redefinir senha</label>
            <form onSubmit={onSubmit((fd) => run(() => redefinirSenhaUsuario(edit.id, String(fd.get("senha")))))} className="flex gap-2"><input name="senha" type="text" minLength={8} required className="input" placeholder="nova senha" /><button className="btn btn-outline" disabled={pending}>Redefinir</button></form>
          </div>
        </div>)}
      </Modal>
    </div>
  );
}

function UnidadesCheck({ ativas, selecionadas }: { ativas: Unidade[]; selecionadas: string[] | null }) {
  return (
    <div><label className="label">Acesso às unidades (nenhuma marcada = todas)</label>
      <div className="flex flex-wrap gap-3">{ativas.map((u) => <label key={u.id} className="flex items-center gap-1 text-sm"><input type="checkbox" name="unidades" value={u.id} defaultChecked={selecionadas?.includes(u.id) ?? false} /> {u.nome}</label>)}</div></div>
  );
}

function Unidades({ lista }: { lista: Unidade[] }) {
  const { pending, run, aviso } = useAcao();
  const [edit, setEdit] = useState<Unidade | null | "nova">(null);
  const u = edit === "nova" ? null : edit;
  return (
    <div className="space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="flex justify-between items-center"><p className="text-sm text-muted">Nova unidade entra no menu, no catálogo e nas transferências automaticamente, com saldos zerados.</p><button className="btn btn-gold" onClick={() => setEdit("nova")}>+ Nova unidade</button></div>
      <div className="card scroll-x"><table className="tbl"><thead><tr><th>Código</th><th>Nome</th><th>Cidade</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
        <tbody>{lista.map((x) => <tr key={x.id}><td className="font-mono">{x.codigo}</td><td className="font-semibold">{x.nome}</td><td>{x.cidade}</td><td>{x.ordem}</td><td><span className={`badge ${x.ativa ? "badge-normal" : "badge-neutro"}`}>{x.ativa ? "Ativa" : "Inativa"}</span></td><td><button className="btn btn-outline btn-sm" onClick={() => setEdit(x)}>Editar</button></td></tr>)}</tbody></table></div>
      <Modal aberto={edit !== null} onFechar={() => setEdit(null)} titulo={u ? "Editar unidade" : "Nova unidade"}>
        <form onSubmit={onSubmit((fd) => run(() => salvarUnidade(fd), () => setEdit(null)))} className="space-y-3">
          {u && <input type="hidden" name="id" value={u.id} />}
          <div><label className="label">Código (curto, sem espaço)</label><input name="codigo" required className="input font-mono" defaultValue={u?.codigo ?? ""} placeholder="Ex.: RECIFE" /></div>
          <div><label className="label">Nome</label><input name="nome" required className="input" defaultValue={u?.nome ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Cidade</label><input name="cidade" className="input" defaultValue={u?.cidade ?? ""} /></div><div><label className="label">Ordem no menu</label><input name="ordem" type="number" className="input" defaultValue={u?.ordem ?? 99} /></div></div>
          <div><label className="label">Status</label><select name="ativa" className="input" defaultValue={String(u?.ativa ?? true)}><option value="true">Ativa</option><option value="false">Inativa</option></select></div>
          <div className="flex justify-end"><button className="btn btn-primary" disabled={pending}>Salvar</button></div>
        </form>
      </Modal>
    </div>
  );
}

function Categorias({ lista }: { lista: Categoria[] }) {
  const { pending, run, aviso } = useAcao();
  return (
    <div className="space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <form onSubmit={onSubmit((fd) => run(() => salvarCategoria(fd)))} className="card p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]"><label className="label">Nova categoria</label><input name="nome" required className="input" placeholder="Ex.: Suplementos em pó" /></div>
        <div><label className="label">Dentro de (opcional)</label><select name="categoria_pai_id" className="input"><option value="">Nenhuma</option>{lista.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <button className="btn btn-primary" disabled={pending}>Adicionar</button>
      </form>
      <div className="card"><ul className="divide-y divide-line">{lista.map((c) => <li key={c.id} className="flex justify-between items-center px-4 py-2"><span>{c.nome}{c.categoria_pai_id && <span className="text-muted text-xs"> · em {lista.find((x) => x.id === c.categoria_pai_id)?.nome}</span>}</span><button className="text-red text-xs" onClick={() => { if (window.confirm("Excluir categoria? Os produtos ficam sem categoria.")) run(() => excluirCategoria(c.id)); }}>excluir</button></li>)}{lista.length === 0 && <li className="px-4 py-6 text-muted text-center">Nenhuma categoria. A planilha original não tinha essa informação.</li>}</ul></div>
    </div>
  );
}

function Campos({ lista }: { lista: CampoPersonalizado[] }) {
  const { pending, run, aviso } = useAcao();
  return (
    <div className="space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <p className="text-sm text-muted">Campos criados aqui aparecem na ficha de todos os produtos, sem alterar o sistema.</p>
      <form onSubmit={onSubmit((fd) => run(() => salvarCampoPersonalizado(fd)))} className="card p-4 grid md:grid-cols-4 gap-2 items-end">
        <div><label className="label">Rótulo</label><input name="rotulo" required className="input" placeholder="Ex.: Validade padrão" /></div>
        <div><label className="label">Tipo</label><select name="tipo" className="input"><option value="texto">Texto</option><option value="numero">Número</option><option value="data">Data</option><option value="lista">Lista de opções</option><option value="booleano">Sim / Não</option></select></div>
        <div><label className="label">Opções (lista, separadas por vírgula)</label><input name="opcoes" className="input" placeholder="A, B, C" /></div>
        <button className="btn btn-primary" disabled={pending}>Adicionar campo</button>
      </form>
      <div className="card"><ul className="divide-y divide-line">{lista.map((c) => <li key={c.id} className="flex justify-between items-center px-4 py-2"><span><b>{c.rotulo}</b> <span className="text-muted text-xs">({c.tipo}{c.opcoes ? `: ${c.opcoes.join(", ")}` : ""})</span></span><button className="text-red text-xs" onClick={() => run(() => desativarCampoPersonalizado(c.id))}>remover</button></li>)}{lista.length === 0 && <li className="px-4 py-6 text-muted text-center">Nenhum campo personalizado.</li>}</ul></div>
    </div>
  );
}

function Importar() {
  const { pending, run, aviso } = useAcao();
  const [tipo, setTipo] = useState<"produtos" | "movimentacoes">("movimentacoes");
  const [previa, setPrevia] = useState<Record<string, unknown>[]>([]);
  const [nomeArq, setNomeArq] = useState("");

  async function ler(f: File | undefined) {
    if (!f) return;
    setNomeArq(f.name);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false });
    setPrevia(rows);
  }
  const g = (r: Record<string, unknown>, ...ks: string[]) => { for (const k of ks) { const e = Object.entries(r).find(([c]) => c.trim().toLowerCase() === k); if (e && e[1] !== null && e[1] !== "") return String(e[1]).trim(); } return null; };
  const toDate = (v: string | null) => { if (!v) return null; const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };

  function importar() {
    if (tipo === "produtos") {
      const linhas: LinhaImportProduto[] = previa.map((r) => ({ sku: g(r, "sku", "código", "codigo") ?? "", nome: g(r, "nome", "produto") ?? "", categoria: g(r, "categoria") ?? undefined, custo: Number(g(r, "custo", "custo unitário")?.replace(",", ".")) || null, preco: Number(g(r, "preço", "preco", "preço de venda")?.replace(",", ".")) || null, codigo_barras: g(r, "código de barras", "ean"), descricao: g(r, "descrição", "descricao") }));
      run(() => importarProdutos(linhas), () => setPrevia([]));
    } else {
      const linhas: LinhaImportMov[] = previa.map((r) => ({ sku: g(r, "sku", "produto", "nome") ?? "", unidade: g(r, "unidade", "local") ?? "", tipo: g(r, "tipo", "status") ?? "", quantidade: Number(g(r, "quantidade", "qtd")) || 0, data: toDate(g(r, "data")), destino: g(r, "destino", "coluna1", "destino / origem"), referencia: g(r, "referência", "referencia", "pedido"), observacoes: g(r, "observações", "observacoes", "coluna2"), justificativa: g(r, "justificativa") }));
      run(() => importarMovimentacoes(linhas), () => setPrevia([]));
    }
  }
  const cols = previa[0] ? Object.keys(previa[0]).slice(0, 8) : [];
  return (
    <div className="space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="card p-4 space-y-3">
        <h3 className="font-bold text-navy">Importar Excel ou CSV</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="label">O que importar</label><select className="input" value={tipo} onChange={(e) => { setTipo(e.target.value as "produtos" | "movimentacoes"); setPrevia([]); }}><option value="movimentacoes">Movimentações (entradas e saídas)</option><option value="produtos">Produtos (cadastro)</option></select></div>
          <div><label className="label">Arquivo</label><input type="file" accept=".xlsx,.xls,.csv" className="input" onChange={(e) => ler(e.target.files?.[0])} /></div>
        </div>
        <p className="text-xs text-muted">{tipo === "movimentacoes" ? "Colunas aceitas: Data, Produto (ou SKU), Unidade (SEDE / ARACAJU), Tipo (RECEBIDO/ENTRADA, SAÍDA, AJUSTE, DANIFICADO), Qtd, Destino, Referência, Observações. Mesmo formato da aba de logística da planilha antiga." : "Colunas aceitas: SKU, Nome, Categoria, Custo, Preço, Código de barras, Descrição. SKU existente atualiza; novo cria."}</p>
        {previa.length > 0 && (<>
          <p className="text-sm"><b>{nomeArq}</b>: {previa.length} linha(s) lidas. Prévia das primeiras 5:</p>
          <div className="scroll-x"><table className="tbl"><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{previa.slice(0, 5).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>)}</tbody></table></div>
          <button className="btn btn-primary" onClick={importar} disabled={pending}>{pending ? "Importando..." : `Importar ${previa.length} linha(s)`}</button>
        </>)}
      </div>
      <div className="card p-4"><h3 className="font-bold text-navy mb-2">Exportar</h3><div className="flex flex-wrap gap-2"><a href="/api/exportar?tipo=estoque&formato=xlsx" className="btn btn-outline">Estoque (Excel)</a><a href="/api/exportar?tipo=estoque&formato=csv" className="btn btn-outline">Estoque (CSV)</a><a href="/api/exportar?tipo=movimentacoes&formato=xlsx" className="btn btn-outline">Movimentações 30 dias (Excel)</a></div></div>
    </div>
  );
}

function MinhaConta({ eu }: { eu: Perfil }) {
  const { pending, run, aviso } = useAcao();
  return (
    <div className="card p-4 max-w-md space-y-3">
      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="text-sm"><b>{eu.nome}</b> · {eu.email} · {PAPEL_LABEL[eu.papel]}</div>
      <form onSubmit={onSubmit((fd) => run(() => alterarMinhaSenha(String(fd.get("senha")))))} className="space-y-2">
        <div><label className="label">Nova senha (mín. 8 caracteres)</label><input name="senha" type="password" minLength={8} required className="input" autoComplete="new-password" /></div>
        <button className="btn btn-primary" disabled={pending}>Alterar senha</button>
      </form>
    </div>
  );
}
