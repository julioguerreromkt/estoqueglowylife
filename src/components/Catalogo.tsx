"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import type { SaldoProduto, Unidade, Papel, Categoria } from "@/lib/types";
import { num } from "@/lib/format";
import { StatusBadge, Miniatura } from "@/components/ui";
import { MovimentoModal } from "@/components/MovimentoForm";
import { podeMovimentar } from "@/lib/types";

export default function Catalogo({ saldos, unidades, categorias, papel, statusInicial }: { saldos: SaldoProduto[]; unidades: Unidade[]; categorias: Categoria[]; papel: Papel; statusInicial?: string }) {
  const [visao, setVisao] = useState<"tabela" | "cartoes">("tabela");
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState(statusInicial ?? "");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [mov, setMov] = useState<{ modo: "ENTRADA" | "SAIDA"; produto: string } | null>(null);
  const ativas = unidades.filter((u) => u.ativa);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return saldos.filter((s) =>
      (mostrarInativos || s.ativo) &&
      (!cat || s.categoria_id === cat) &&
      (!status || s.status_estoque === status) &&
      (!b || s.nome.toLowerCase().includes(b) || s.sku.toLowerCase().includes(b) || (s.categoria ?? "").toLowerCase().includes(b))
    );
  }, [saldos, busca, cat, status, mostrarInativos]);

  const opcoes = saldos.map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, por_unidade: s.por_unidade }));

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input className="input pl-9" placeholder="Buscar por nome, código ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option><option value="NORMAL">Normal</option><option value="BAIXO">Baixo</option><option value="ESGOTADO">Esgotado</option></select>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> inativos</label>
        <div className="flex rounded-lg border border-line overflow-hidden">
          <button className={`p-2 ${visao === "tabela" ? "bg-navy text-white" : ""}`} onClick={() => setVisao("tabela")} aria-label="Tabela"><List size={16} /></button>
          <button className={`p-2 ${visao === "cartoes" ? "bg-navy text-white" : ""}`} onClick={() => setVisao("cartoes")} aria-label="Cartões"><LayoutGrid size={16} /></button>
        </div>
        <span className="text-sm text-muted">{lista.length} produto(s)</span>
      </div>

      {visao === "tabela" ? (
        <div className="card scroll-x">
          <table className="tbl">
            <thead><tr><th></th><th>Código</th><th>Nome</th><th>Categoria</th>{ativas.map((u) => <th key={u.id} className="num">{u.nome}</th>)}<th className="num">Total</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.produto_id}>
                  <td><Miniatura url={s.foto_principal_url} nome={s.nome} /></td>
                  <td className="font-mono text-xs">{s.sku}</td>
                  <td><Link href={`/produtos/${s.produto_id}`} className="font-semibold text-navy hover:underline">{s.nome}</Link>{!s.ativo && <span className="badge badge-neutro ml-2">inativo</span>}</td>
                  <td className="text-muted">{s.categoria ?? "—"}</td>
                  {ativas.map((u) => <td key={u.id} className="num">{num(s.por_unidade?.[u.codigo] ?? 0)}</td>)}
                  <td className="num font-bold">{num(s.disponivel)}</td>
                  <td><StatusBadge status={s.status_estoque} /></td>
                  <td className="whitespace-nowrap">
                    <Link href={`/produtos/${s.produto_id}`} className="btn btn-outline btn-sm mr-1">Ver</Link>
                    <Link href={`/produtos/${s.produto_id}/editar`} className="btn btn-outline btn-sm mr-1">Editar</Link>
                    {podeMovimentar(papel) && <button className="btn btn-gold btn-sm" onClick={() => setMov({ modo: "SAIDA", produto: s.produto_id })}>Movimentar</button>}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={8 + ativas.length} className="text-center text-muted py-8">Nenhum produto encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {lista.map((s) => (
            <div key={s.produto_id} className="card p-3 flex flex-col">
              <Link href={`/produtos/${s.produto_id}`} className="block">
                {s.foto_principal_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.foto_principal_url} alt={s.nome} className="w-full aspect-square object-cover rounded-lg bg-bg" />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-navy/5 flex items-center justify-center text-navy font-bold text-3xl">{s.nome.slice(0, 2)}</div>
                )}
              </Link>
              <div className="mt-2 flex-1">
                <div className="text-xs font-mono text-muted">{s.sku}</div>
                <Link href={`/produtos/${s.produto_id}`} className="font-semibold text-navy">{s.nome}</Link>
                <div className="text-xs text-muted mt-1">{ativas.map((u) => `${u.nome}: ${num(s.por_unidade?.[u.codigo] ?? 0)}`).join(" · ")}</div>
              </div>
              <div className="flex justify-between items-center mt-2"><span className="font-bold">{num(s.disponivel)} un</span><StatusBadge status={s.status_estoque} /></div>
            </div>
          ))}
        </div>
      )}
      <MovimentoModal modo={mov?.modo ?? null} onFechar={() => setMov(null)} produtos={opcoes} unidades={unidades} produtoFixo={mov?.produto} />
    </div>
  );
}
