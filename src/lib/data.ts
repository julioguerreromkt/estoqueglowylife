import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Perfil, Unidade, SaldoProduto, Produto, Movimentacao, Transferencia, Pendencia, Categoria, Fornecedor, CampoPersonalizado } from "./types";

export async function getSessao() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).single();
  if (!perfil || !perfil.ativo) {
    return { supabase, user, perfil: null as Perfil | null };
  }
  return { supabase, user, perfil: perfil as Perfil };
}

export async function getUnidades(): Promise<Unidade[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("unidades").select("*").order("ordem");
  return (data ?? []) as Unidade[];
}

export async function getSaldosProduto(): Promise<SaldoProduto[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("v_saldos_produto").select("*").order("nome");
  return (data ?? []) as SaldoProduto[];
}

export async function getProduto(id: string) {
  const supabase = await createClient();
  const [{ data: produto }, { data: saldos }, { data: imagens }, { data: anexos }, { data: movs }] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", id).single(),
    supabase.from("saldos").select("*, unidades(codigo,nome,ordem)").eq("produto_id", id),
    supabase.from("produto_imagens").select("*").eq("produto_id", id).order("ordem"),
    supabase.from("produto_anexos").select("*").eq("produto_id", id).order("criado_em", { ascending: false }),
    supabase.from("movimentacoes").select("*, unidades(codigo,nome)").eq("produto_id", id).order("data_movimento", { ascending: false }).order("id", { ascending: false }).limit(300),
  ]);
  return { produto: produto as Produto | null, saldos: saldos ?? [], imagens: imagens ?? [], anexos: anexos ?? [], movs: (movs ?? []) as Movimentacao[] };
}

export async function getCategorias(): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categorias").select("*").order("nome");
  return (data ?? []) as Categoria[];
}

export async function getFornecedores(): Promise<Fornecedor[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("fornecedores").select("*").order("nome");
  return (data ?? []) as Fornecedor[];
}

export async function getCamposPersonalizados(): Promise<CampoPersonalizado[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("campos_personalizados").select("*").eq("ativo", true).order("ordem");
  return (data ?? []) as CampoPersonalizado[];
}

export interface FiltroMov {
  de?: string;
  ate?: string;
  produto?: string;
  unidade?: string;
  tipo?: string;
  busca?: string;
  limite?: number;
}

export async function getMovimentacoes(f: FiltroMov = {}): Promise<Movimentacao[]> {
  const supabase = await createClient();
  let q = supabase
    .from("movimentacoes")
    .select("*, produtos(nome,sku), unidades(codigo,nome)")
    .order("data_movimento", { ascending: false })
    .order("id", { ascending: false })
    .limit(f.limite ?? 500);
  if (f.de) q = q.gte("data_movimento", f.de);
  if (f.ate) q = q.lte("data_movimento", f.ate);
  if (f.produto) q = q.eq("produto_id", f.produto);
  if (f.unidade) q = q.eq("unidade_id", f.unidade);
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.busca) q = q.or(`destino.ilike.%${f.busca}%,referencia.ilike.%${f.busca}%,observacoes.ilike.%${f.busca}%`);
  const { data } = await q;
  return (data ?? []) as Movimentacao[];
}

export async function getTransferencias(): Promise<Transferencia[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transferencias")
    .select("*, produtos(nome,sku), origem:unidades!transferencias_unidade_origem_id_fkey(codigo,nome), destino:unidades!transferencias_unidade_destino_id_fkey(codigo,nome)")
    .order("enviada_em", { ascending: false })
    .limit(300);
  return (data ?? []) as unknown as Transferencia[];
}

export async function getPendencias(): Promise<Pendencia[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pendencias_inventario")
    .select("*, produtos(nome,sku), unidades(codigo,nome)")
    .order("status")
    .order("criado_em", { ascending: false });
  return (data ?? []) as Pendencia[];
}

export async function getPerfis(): Promise<Perfil[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("perfis").select("*").order("nome");
  return (data ?? []) as Perfil[];
}

export async function getDashboard() {
  const supabase = await createClient();
  const de30 = new Date();
  de30.setDate(de30.getDate() - 30);
  const de30s = de30.toISOString().slice(0, 10);
  const [saldos, unidades, { data: recentes }, { data: transf }, { data: movs30 }, { data: pend }] = await Promise.all([
    getSaldosProduto(),
    getUnidades(),
    supabase.from("movimentacoes").select("*, produtos(nome,sku), unidades(codigo,nome)").order("data_movimento", { ascending: false }).order("id", { ascending: false }).limit(10),
    supabase.from("transferencias").select("*, produtos(nome,sku), origem:unidades!transferencias_unidade_origem_id_fkey(codigo,nome), destino:unidades!transferencias_unidade_destino_id_fkey(codigo,nome)").in("status", ["ENVIADA", "EM_TRANSITO"]).order("enviada_em", { ascending: false }),
    supabase.from("movimentacoes").select("tipo, quantidade, data_movimento, produto_id, unidade_id").gte("data_movimento", de30s),
    supabase.from("pendencias_inventario").select("id").eq("status", "ABERTA"),
  ]);
  return {
    saldos,
    unidades,
    recentes: (recentes ?? []) as Movimentacao[],
    transferenciasPendentes: (transf ?? []) as unknown as Transferencia[],
    movs30: (movs30 ?? []) as { tipo: string; quantidade: number; data_movimento: string; produto_id: string; unidade_id: string }[],
    pendenciasAbertas: (pend ?? []).length,
  };
}
