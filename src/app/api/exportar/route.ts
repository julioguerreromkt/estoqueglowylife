import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getMovimentacoes, getSaldosProduto, getUnidades } from "@/lib/data";
import { TIPO_LABEL, type TipoMov } from "@/lib/types";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "estoque";
  const formato = sp.get("formato") === "csv" ? "csv" : "xlsx";
  let linhas: Record<string, unknown>[] = [];
  let nome = "estoque";

  if (tipo === "movimentacoes") {
    nome = "movimentacoes";
    const movs = await getMovimentacoes({ de: sp.get("de") ?? undefined, ate: sp.get("ate") ?? undefined, produto: sp.get("produto") ?? undefined, unidade: sp.get("unidade") ?? undefined, tipo: sp.get("tipo_mov") ?? undefined, busca: sp.get("busca") ?? undefined, limite: 5000 });
    linhas = movs.map((m) => ({
      Data: m.data_movimento, Tipo: TIPO_LABEL[m.tipo as TipoMov], Produto: m.produtos?.nome, SKU: m.produtos?.sku, Unidade: m.unidades?.nome,
      "Saldo anterior": m.saldo_anterior, Quantidade: m.quantidade, "Saldo resultante": m.saldo_resultante, "Destino / origem": m.destino, Motivo: m.motivo,
      Referência: m.referencia, Observações: m.observacoes, Justificativa: m.justificativa, "Importado da planilha": m.importado ? "Sim" : "Não", "Data estimada": m.data_estimada ? "Sim" : "Não",
    }));
  } else if (tipo === "parados") {
    nome = "produtos_parados";
    const dias = Number(sp.get("dias") ?? 30);
    const de = new Date(); de.setDate(de.getDate() - dias);
    const [saldos, { data: movs }] = await Promise.all([getSaldosProduto(), supabase.from("movimentacoes").select("produto_id").gte("data_movimento", de.toISOString().slice(0, 10)).in("tipo", ["SAIDA", "TRANSF_SAIDA"])]);
    const comSaida = new Set((movs ?? []).map((m) => m.produto_id));
    linhas = saldos.filter((s) => s.ativo && !comSaida.has(s.produto_id)).map((s) => ({ Produto: s.nome, SKU: s.sku, "Estoque total": s.total, Status: s.status_estoque, [`Sem saída há (dias)`]: `${dias}+` }));
  } else {
    nome = "estoque";
    const [saldos, unidades] = await Promise.all([getSaldosProduto(), getUnidades()]);
    linhas = saldos.map((s) => {
      const r: Record<string, unknown> = { SKU: s.sku, Produto: s.nome, Categoria: s.categoria, Ativo: s.ativo ? "Sim" : "Não" };
      unidades.filter((u) => u.ativa).forEach((u) => { r[u.nome] = s.por_unidade?.[u.codigo] ?? 0; r[`Mínimo ${u.nome}`] = s.minimo_por_unidade?.[u.codigo] ?? 0; });
      r["Total"] = s.total; r["Reservada"] = s.reservada; r["Disponível"] = s.disponivel; r["Status"] = s.status_estoque;
      r["Custo unitário"] = s.custo_unitario; r["Preço de venda"] = s.preco_venda; r["Valor em estoque (custo)"] = s.custo_unitario ? s.custo_unitario * s.total : null;
      return r;
    });
  }
  const ws = XLSX.utils.json_to_sheet(linhas);
  const data = new Date().toISOString().slice(0, 10);
  if (formato === "csv") {
    const csv = "﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nome}_${data}.csv"` } });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${nome}_${data}.xlsx"` } });
}
