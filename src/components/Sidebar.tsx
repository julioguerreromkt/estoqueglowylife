"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Package, Warehouse, ArrowLeftRight, Repeat, ClipboardCheck, Truck, BarChart3, Settings, Menu, X, Plus, LogOut } from "lucide-react";
import type { Unidade, Perfil } from "@/lib/types";
import { PAPEL_LABEL } from "@/lib/types";
import { sair } from "@/app/actions/cadastros";

export default function Sidebar({ unidades, perfil }: { unidades: Unidade[]; perfil: Perfil }) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  const itens = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/produtos", label: "Produtos", icon: Package },
    ...unidades.filter((u) => u.ativa).map((u) => ({ href: `/estoque/${u.codigo.toLowerCase()}`, label: `Estoque ${u.nome}`, icon: Warehouse })),
    { href: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
    { href: "/transferencias", label: "Transferências", icon: Repeat },
    { href: "/inventario", label: "Inventário", icon: ClipboardCheck },
    { href: "/fornecedores", label: "Fornecedores", icon: Truck },
    { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { href: "/configuracoes", label: "Usuários e Configurações", icon: Settings },
  ];
  const ativo = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {itens.map((i) => (
        <Link key={i.href} href={i.href} className={`nav-item ${ativo(i.href) ? "ativo" : ""}`} onClick={() => setAberto(false)}>
          <i.icon size={18} /> <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-navy text-white flex items-center justify-between px-4 h-14">
        <button onClick={() => setAberto(true)} aria-label="Abrir menu"><Menu /></button>
        <span className="font-bold tracking-wide">Estoque Glowy</span>
        <Link href="/produtos/novo" className="btn btn-gold btn-sm"><Plus size={16} /></Link>
      </header>
      {aberto && <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setAberto(false)} />}
      <aside className={`fixed z-50 top-0 left-0 h-full w-72 bg-navy text-white flex flex-col transition-transform lg:translate-x-0 ${aberto ? "translate-x-0" : "-translate-x-full"} lg:static lg:h-screen lg:sticky`}>
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold tracking-[.25em] text-gold">GLOWY LIFE</div>
            <div className="font-bold text-lg leading-tight">Controle de Estoque</div>
          </div>
          <button className="lg:hidden" onClick={() => setAberto(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <div className="px-3 mb-3">
          <Link href="/produtos/novo" className="btn btn-gold w-full justify-center" onClick={() => setAberto(false)}>
            <Plus size={18} /> Cadastrar Produto
          </Link>
        </div>
        {nav}
        <div className="mt-auto px-5 py-4 border-t border-white/10 text-sm">
          <div className="font-semibold truncate">{perfil.nome}</div>
          <div className="text-white/60 text-xs">{PAPEL_LABEL[perfil.papel]}</div>
          <button onClick={() => sair().then(() => window.location.assign("/login"))} className="mt-2 flex items-center gap-2 text-white/70 hover:text-white text-xs"><LogOut size={14} /> Sair</button>
        </div>
      </aside>
    </>
  );
}
