"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Resultado } from "./estoque";

function erro(e: unknown): Resultado {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: string }).message) : String(e);
  return { ok: false, erro: m };
}

function limpar(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}
function numero(v: FormDataEntryValue | null) {
  const s = limpar(v);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function salvarProduto(fd: FormData): Promise<Resultado & { id?: string }> {
  try {
    const supabase = await createClient();
    const id = limpar(fd.get("id"));
    const extras: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("extra__")) extras[k.slice(7)] = v.toString();
    }
    const variacoes: Record<string, string> = {};
    const cor = limpar(fd.get("var_cor")); if (cor) variacoes.cor = cor;
    const tamanho = limpar(fd.get("var_tamanho")); if (tamanho) variacoes.tamanho = tamanho;
    const sabor = limpar(fd.get("var_sabor")); if (sabor) variacoes.sabor = sabor;
    const dados = {
      sku: limpar(fd.get("sku"))?.toUpperCase(),
      codigo_interno: limpar(fd.get("codigo_interno")),
      nome: limpar(fd.get("nome")),
      categoria_id: limpar(fd.get("categoria_id")),
      subcategoria: limpar(fd.get("subcategoria")),
      marca: limpar(fd.get("marca")),
      modelo: limpar(fd.get("modelo")),
      codigo_barras: limpar(fd.get("codigo_barras")),
      descricao: limpar(fd.get("descricao")),
      unidade_medida: limpar(fd.get("unidade_medida")) ?? "UN",
      variacoes,
      ativo: fd.get("ativo") === "on" || fd.get("ativo") === "true",
      fornecedor_id: limpar(fd.get("fornecedor_id")),
      referencia_fornecedor: limpar(fd.get("referencia_fornecedor")),
      custo_unitario: numero(fd.get("custo_unitario")),
      preco_venda: numero(fd.get("preco_venda")),
      data_ultima_compra: limpar(fd.get("data_ultima_compra")),
      foto_principal_url: limpar(fd.get("foto_principal_url")),
      observacoes: limpar(fd.get("observacoes")),
      campos_extras: extras,
    };
    if (!dados.nome) return { ok: false, erro: "Nome é obrigatório" };
    if (!dados.sku) return { ok: false, erro: "SKU é obrigatório" };
    let novoId = id;
    if (id) {
      const { error } = await supabase.from("produtos").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("produtos").insert(dados).select("id").single();
      if (error) throw error;
      novoId = data.id;
    }
    // mínimos e localização por unidade
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("minimo__")) {
        const unidade_id = k.slice(8);
        const loc = limpar(fd.get("loc__" + unidade_id));
        await supabase.from("saldos").update({ estoque_minimo: Number(v) || 0, localizacao: loc }).eq("produto_id", novoId!).eq("unidade_id", unidade_id);
      }
    }
    revalidatePath("/produtos");
    revalidatePath("/");
    revalidatePath(`/produtos/${novoId}`);
    return { ok: true, id: novoId! };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarImagemProduto(produto_id: string, url: string, caminho: string, principal: boolean): Promise<Resultado> {
  try {
    const supabase = await createClient();
    if (principal) {
      const { error } = await supabase.from("produtos").update({ foto_principal_url: url }).eq("id", produto_id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("produto_imagens").insert({ produto_id, url, caminho_storage: caminho });
      if (error) throw error;
    }
    revalidatePath(`/produtos/${produto_id}`);
    revalidatePath("/produtos");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function removerImagemProduto(produto_id: string, imagem_id: string | null, caminho: string | null): Promise<Resultado> {
  try {
    const supabase = await createClient();
    if (imagem_id) {
      const { error } = await supabase.from("produto_imagens").delete().eq("id", imagem_id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("produtos").update({ foto_principal_url: null }).eq("id", produto_id);
      if (error) throw error;
    }
    if (caminho) await supabase.storage.from("produtos").remove([caminho]);
    revalidatePath(`/produtos/${produto_id}`);
    revalidatePath("/produtos");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarAnexoProduto(produto_id: string, nome: string, url: string, caminho: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("produto_anexos").insert({ produto_id, nome, url, caminho_storage: caminho, criado_por: user?.id });
    if (error) throw error;
    revalidatePath(`/produtos/${produto_id}`);
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function removerAnexo(produto_id: string, id: string, caminho: string | null): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produto_anexos").delete().eq("id", id);
    if (error) throw error;
    if (caminho) await supabase.storage.from("produtos").remove([caminho]);
    revalidatePath(`/produtos/${produto_id}`);
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarCategoria(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const nome = limpar(fd.get("nome"));
    if (!nome) return { ok: false, erro: "Nome obrigatório" };
    const { error } = await supabase.from("categorias").insert({ nome, categoria_pai_id: limpar(fd.get("categoria_pai_id")) });
    if (error) throw error;
    revalidatePath("/configuracoes");
    revalidatePath("/produtos");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarFornecedor(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const id = limpar(fd.get("id"));
    const dados = {
      nome: limpar(fd.get("nome")),
      cnpj: limpar(fd.get("cnpj")),
      contato: limpar(fd.get("contato")),
      telefone: limpar(fd.get("telefone")),
      email: limpar(fd.get("email")),
      observacoes: limpar(fd.get("observacoes")),
      ativo: fd.get("ativo") !== "false",
    };
    if (!dados.nome) return { ok: false, erro: "Nome obrigatório" };
    const { error } = id ? await supabase.from("fornecedores").update(dados).eq("id", id) : await supabase.from("fornecedores").insert(dados);
    if (error) throw error;
    revalidatePath("/fornecedores");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarUnidade(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const id = limpar(fd.get("id"));
    const dados = {
      codigo: limpar(fd.get("codigo"))?.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
      nome: limpar(fd.get("nome")),
      cidade: limpar(fd.get("cidade")),
      ativa: fd.get("ativa") !== "false",
      ordem: Number(fd.get("ordem") || 99),
    };
    if (!dados.codigo || !dados.nome) return { ok: false, erro: "Código e nome são obrigatórios" };
    const { error } = id ? await supabase.from("unidades").update(dados).eq("id", id) : await supabase.from("unidades").insert(dados);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function salvarCampoPersonalizado(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const rotulo = limpar(fd.get("rotulo"));
    if (!rotulo) return { ok: false, erro: "Rótulo obrigatório" };
    const chave = rotulo.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const opcoesTxt = limpar(fd.get("opcoes"));
    const { error } = await supabase.from("campos_personalizados").insert({
      chave, rotulo, tipo: limpar(fd.get("tipo")) ?? "texto",
      opcoes: opcoesTxt ? opcoesTxt.split(",").map((s) => s.trim()).filter(Boolean) : null,
      ordem: Number(fd.get("ordem") || 0),
    });
    if (error) throw error;
    revalidatePath("/configuracoes");
    revalidatePath("/produtos");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function desativarCampoPersonalizado(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("campos_personalizados").update({ ativo: false }).eq("id", id);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

// ---------------- USUÁRIOS ----------------
export async function criarUsuario(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const email = limpar(fd.get("email"))?.toLowerCase();
    const senha = limpar(fd.get("senha"));
    const nome = limpar(fd.get("nome"));
    const papel = limpar(fd.get("papel")) ?? "consulta";
    const unidades = fd.getAll("unidades").map(String).filter(Boolean);
    if (!email || !senha || !nome) return { ok: false, erro: "Nome, e-mail e senha são obrigatórios" };
    const { error } = await supabase.rpc("admin_criar_usuario", { p_email: email, p_senha: senha, p_nome: nome, p_papel: papel, p_unidades: unidades.length ? unidades : null });
    if (error) throw error;
    revalidatePath("/configuracoes");
    return { ok: true, msg: `Usuário ${email} criado` };
  } catch (e) {
    return erro(e);
  }
}

export async function atualizarPerfil(fd: FormData): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const id = String(fd.get("id"));
    const unidades = fd.getAll("unidades").map(String).filter(Boolean);
    const { error } = await supabase.from("perfis").update({
      nome: limpar(fd.get("nome")) ?? "",
      papel: limpar(fd.get("papel")) ?? "consulta",
      unidades_permitidas: unidades.length ? unidades : null,
      ativo: fd.get("ativo") !== "false",
    }).eq("id", id);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function redefinirSenhaUsuario(id: string, senha: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_redefinir_senha", { p_usuario: id, p_senha: senha });
    if (error) throw error;
    return { ok: true, msg: "Senha redefinida" };
  } catch (e) {
    return erro(e);
  }
}

export async function alterarMinhaSenha(senha: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    if (senha.length < 8) return { ok: false, erro: "Senha precisa ter ao menos 8 caracteres" };
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw error;
    return { ok: true, msg: "Senha alterada" };
  } catch (e) {
    return erro(e);
  }
}

export async function entrar(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email")).trim().toLowerCase(),
    password: String(fd.get("senha")),
  });
  if (error) redirect("/login?erro=" + encodeURIComponent("E-mail ou senha incorretos"));
  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------- IMPORTAÇÃO ----------------
export interface LinhaImportProduto { sku: string; nome: string; categoria?: string; custo?: number | null; preco?: number | null; codigo_barras?: string | null; descricao?: string | null }
export interface LinhaImportMov { sku: string; unidade: string; tipo: string; quantidade: number; data?: string | null; destino?: string | null; referencia?: string | null; observacoes?: string | null; justificativa?: string | null }

export async function importarProdutos(linhas: LinhaImportProduto[]): Promise<Resultado> {
  try {
    const supabase = await createClient();
    let criados = 0, atualizados = 0;
    const { data: cats } = await supabase.from("categorias").select("id,nome");
    const catMap = new Map((cats ?? []).map((c) => [c.nome.toLowerCase(), c.id]));
    for (const l of linhas) {
      if (!l.sku || !l.nome) continue;
      let categoria_id: string | null = null;
      if (l.categoria) {
        const k = l.categoria.toLowerCase();
        if (!catMap.has(k)) {
          const { data } = await supabase.from("categorias").insert({ nome: l.categoria }).select("id").single();
          if (data) catMap.set(k, data.id);
        }
        categoria_id = catMap.get(k) ?? null;
      }
      const { data: ex } = await supabase.from("produtos").select("id").eq("sku", l.sku.toUpperCase()).maybeSingle();
      const dados = { nome: l.nome, categoria_id, custo_unitario: l.custo ?? null, preco_venda: l.preco ?? null, codigo_barras: l.codigo_barras ?? null, descricao: l.descricao ?? null };
      if (ex) { await supabase.from("produtos").update(dados).eq("id", ex.id); atualizados++; }
      else { const { error } = await supabase.from("produtos").insert({ sku: l.sku.toUpperCase(), ...dados, origem_importacao: "Importação Excel/CSV" }); if (error) throw error; criados++; }
    }
    revalidatePath("/produtos"); revalidatePath("/");
    return { ok: true, msg: `${criados} produto(s) criado(s), ${atualizados} atualizado(s)` };
  } catch (e) {
    return erro(e);
  }
}

export async function importarMovimentacoes(linhas: LinhaImportMov[]): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const [{ data: prods }, { data: unis }] = await Promise.all([
      supabase.from("produtos").select("id,sku,nome"),
      supabase.from("unidades").select("id,codigo,nome"),
    ]);
    const pMap = new Map<string, string>();
    (prods ?? []).forEach((p) => { pMap.set(p.sku.toUpperCase(), p.id); pMap.set(p.nome.toUpperCase(), p.id); });
    const uMap = new Map<string, string>();
    (unis ?? []).forEach((u) => { uMap.set(u.codigo.toUpperCase(), u.id); uMap.set(u.nome.toUpperCase(), u.id); });
    const tipoMap: Record<string, string> = { ENTRADA: "ENTRADA", RECEBIDO: "ENTRADA", SAIDA: "SAIDA", "SAÍDA": "SAIDA", AJUSTE: "AJUSTE", DANIFICADO: "DANIFICADO" };
    let ok = 0; const erros: string[] = [];
    for (const [i, l] of linhas.entries()) {
      const produto = pMap.get((l.sku ?? "").toUpperCase().trim());
      const unidade = uMap.get((l.unidade ?? "").toUpperCase().trim());
      const tipo = tipoMap[(l.tipo ?? "").toUpperCase().trim()];
      if (!produto || !unidade || !tipo) { erros.push(`Linha ${i + 2}: produto, unidade ou tipo não reconhecido`); continue; }
      const { error } = await supabase.rpc("registrar_movimentacao", {
        p_tipo: tipo, p_produto: produto, p_unidade: unidade, p_quantidade: Number(l.quantidade),
        p_data: l.data || new Date().toISOString().slice(0, 10), p_motivo: "Importação Excel/CSV",
        p_destino: l.destino ?? null, p_referencia: l.referencia ?? null, p_observacoes: l.observacoes ?? null, p_justificativa: l.justificativa ?? null,
      });
      if (error) erros.push(`Linha ${i + 2}: ${error.message}`); else ok++;
    }
    ["/", "/produtos", "/movimentacoes", "/estoque/sede", "/estoque/aracaju"].forEach((p) => revalidatePath(p));
    const msg = `${ok} movimentação(ões) importada(s)` + (erros.length ? `. ${erros.length} com erro: ${erros.slice(0, 5).join(" | ")}` : "");
    return erros.length && !ok ? { ok: false, erro: msg } : { ok: true, msg };
  } catch (e) {
    return erro(e);
  }
}
