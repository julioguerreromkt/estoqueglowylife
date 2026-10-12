"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Resultado = { ok: true; msg?: string } | { ok: false, erro: string };

function erro(e: unknown): Resultado {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: string }).message) : String(e);
  return { ok: false, erro: m };
}

function revalidarTudo() {
  ["/", "/produtos", "/estoque/sede", "/estoque/aracaju", "/movimentacoes", "/transferencias", "/inventario", "/relatorios"].forEach((p) => revalidatePath(p));
}

export async function registrarMovimentacao(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const tipo = String(fd.get("tipo"));
    const quantidade = Number(fd.get("quantidade"));
    if (!Number.isInteger(quantidade) || quantidade < 0) return { ok: false, erro: "Quantidade inválida" };
    const { error } = await supabase.rpc("registrar_movimentacao", {
      p_tipo: tipo,
      p_produto: String(fd.get("produto_id")),
      p_unidade: String(fd.get("unidade_id")),
      p_quantidade: quantidade,
      p_data: String(fd.get("data_movimento") || new Date().toISOString().slice(0, 10)),
      p_motivo: (fd.get("motivo") as string) || null,
      p_destino: (fd.get("destino") as string) || null,
      p_referencia: (fd.get("referencia") as string) || null,
      p_observacoes: (fd.get("observacoes") as string) || null,
      p_justificativa: (fd.get("justificativa") as string) || null,
    });
    if (error) throw error;
    revalidarTudo();
    revalidatePath(`/produtos/${fd.get("produto_id")}`);
    return { ok: true, msg: "Movimentação registrada" };
  } catch (e) {
    return erro(e);
  }
}

export async function criarTransferencia(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("criar_transferencia", {
      p_produto: String(fd.get("produto_id")),
      p_origem: String(fd.get("origem_id")),
      p_destino: String(fd.get("destino_id")),
      p_quantidade: Number(fd.get("quantidade")),
      p_observacoes: (fd.get("observacoes") as string) || null,
    });
    if (error) throw error;
    revalidarTudo();
    return { ok: true, msg: "Transferência enviada. Mercadoria em trânsito." };
  } catch (e) {
    return erro(e);
  }
}

export async function receberTransferencia(id: string, quantidade: number | null, observacoes: string | null): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("receber_transferencia", {
      p_transferencia: id,
      p_quantidade_recebida: quantidade,
      p_observacoes: observacoes,
    });
    if (error) throw error;
    revalidarTudo();
    return { ok: true, msg: "Transferência recebida" };
  } catch (e) {
    return erro(e);
  }
}

export async function cancelarTransferencia(id: string, motivo: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancelar_transferencia", { p_transferencia: id, p_motivo: motivo });
    if (error) throw error;
    revalidarTudo();
    return { ok: true, msg: "Transferência cancelada e estoque devolvido à origem" };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarMinimoLocalizacao(produto_id: string, unidade_id: string, estoque_minimo: number, localizacao: string | null): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("saldos").update({ estoque_minimo, localizacao }).eq("produto_id", produto_id).eq("unidade_id", unidade_id);
    if (error) throw error;
    revalidarTudo();
    revalidatePath(`/produtos/${produto_id}`);
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function resolverPendencia(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("pendencias_inventario").update({ status: "RESOLVIDA", resolvida_em: new Date().toISOString(), resolvida_por: user?.id }).eq("id", id);
    if (error) throw error;
    revalidatePath("/inventario");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

/** Inventário físico: recebe contagens por produto e gera um AJUSTE para cada divergência. */
export async function aplicarInventario(unidade_id: string, contagens: { produto_id: string; contado: number }[], justificativa: string): Promise<Resultado> {
  try {
    if (!justificativa.trim()) return { ok: false, erro: "Informe a justificativa do inventário" };
    const supabase = await createClient();
    const { data: saldos, error: e1 } = await supabase.from("saldos").select("produto_id, quantidade").eq("unidade_id", unidade_id);
    if (e1) throw e1;
    const atual = new Map((saldos ?? []).map((s) => [s.produto_id, s.quantidade]));
    let ajustes = 0;
    for (const c of contagens) {
      if (!Number.isInteger(c.contado) || c.contado < 0) continue;
      if (atual.get(c.produto_id) === c.contado) continue;
      const { error } = await supabase.rpc("registrar_movimentacao", {
        p_tipo: "AJUSTE",
        p_produto: c.produto_id,
        p_unidade: unidade_id,
        p_quantidade: c.contado,
        p_motivo: "Inventário físico",
        p_justificativa: justificativa,
      });
      if (error) throw error;
      ajustes++;
    }
    revalidarTudo();
    return { ok: true, msg: `Inventário aplicado: ${ajustes} ajuste(s) registrado(s)` };
  } catch (e) {
    return erro(e);
  }
}
