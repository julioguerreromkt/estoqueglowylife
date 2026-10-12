"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { TIPO_LABEL } from "@/lib/types";

export function Modal({ aberto, onFechar, titulo, children, largura = "max-w-lg" }: { aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode; largura?: string }) {
  useEffect(() => {
    if (!aberto) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onFechar}>
      <div className={`card w-full ${largura} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-[14px]`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-white rounded-t-[14px]">
          <h2 className="font-bold text-navy text-lg">{titulo}</h2>
          <button onClick={onFechar} className="p-1 rounded hover:bg-bg" aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Aviso({ tipo, msg }: { tipo: "ok" | "erro"; msg: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${tipo === "ok" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`} role="status">
      {msg}
    </div>
  );
}

export function useAviso() {
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);
  return { aviso, setAviso };
}

export function StatusBadge({ status }: { status: "NORMAL" | "BAIXO" | "ESGOTADO" }) {
  const cls = status === "NORMAL" ? "badge-normal" : status === "BAIXO" ? "badge-baixo" : "badge-esgotado";
  const txt = status === "NORMAL" ? "Normal" : status === "BAIXO" ? "Baixo" : "Esgotado";
  return <span className={`badge ${cls}`}>{txt}</span>;
}

export function Miniatura({ url, nome, tamanho = 40 }: { url: string | null; nome: string; tamanho?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nome} width={tamanho} height={tamanho} className="rounded-lg object-cover bg-bg border border-line" style={{ width: tamanho, height: tamanho }} />;
  }
  return (
    <div className="rounded-lg bg-navy/5 border border-line flex items-center justify-center text-navy font-bold" style={{ width: tamanho, height: tamanho, fontSize: tamanho / 3 }} aria-label="Sem foto">
      {nome.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function TipoBadge({ tipo }: { tipo: keyof typeof TIPO_LABEL }) {
  const cls = tipo === "ENTRADA" || tipo === "TRANSF_ENTRADA" ? "badge-normal" : tipo === "AJUSTE" ? "badge-azul" : tipo === "DANIFICADO" ? "badge-esgotado" : "badge-baixo";
  return <span className={`badge ${cls}`}>{TIPO_LABEL[tipo]}</span>;
}
