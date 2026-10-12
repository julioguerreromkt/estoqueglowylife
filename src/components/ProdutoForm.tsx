"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarProduto } from "@/app/actions/cadastros";
import { Aviso, useAviso } from "@/components/ui";
import { slugSku } from "@/lib/format";
import type { Produto, Categoria, Fornecedor, CampoPersonalizado, Unidade, Saldo } from "@/lib/types";
import UploadFotos from "@/components/UploadFotos";

export default function ProdutoForm({ produto, categorias, fornecedores, campos, unidades, saldos }: {
  produto: Produto | null; categorias: Categoria[]; fornecedores: Fornecedor[]; campos: CampoPersonalizado[]; unidades: Unidade[]; saldos: Saldo[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { aviso, setAviso } = useAviso();
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [sku, setSku] = useState(produto?.sku ?? "");
  const [skuManual, setSkuManual] = useState(!!produto);
  const [foto, setFoto] = useState(produto?.foto_principal_url ?? "");

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await salvarProduto(fd);
      if (r.ok) { setAviso({ tipo: "ok", msg: "Produto salvo" }); router.push(`/produtos/${r.id}`); router.refresh(); }
      else setAviso({ tipo: "erro", msg: r.erro });
    });
  }
  const extras = (produto?.campos_extras ?? {}) as Record<string, string>;

  return (
    <form onSubmit={enviar} className="space-y-5">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <input type="hidden" name="foto_principal_url" value={foto} />
      <Secao titulo="Identificação">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><label className="label">Nome do produto *</label>
            <input name="nome" required className="input" value={nome} onChange={(e) => { setNome(e.target.value); if (!skuManual) setSku(slugSku(e.target.value)); }} /></div>
          <div><label className="label">SKU (código único) *</label>
            <input name="sku" required className="input font-mono" value={sku} onChange={(e) => { setSku(e.target.value.toUpperCase()); setSkuManual(true); }} /></div>
          <div><label className="label">Código interno</label><input name="codigo_interno" className="input" defaultValue={produto?.codigo_interno ?? ""} /></div>
          <div><label className="label">Categoria</label>
            <select name="categoria_id" className="input" defaultValue={produto?.categoria_id ?? ""}><option value="">Sem categoria</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label className="label">Subcategoria</label><input name="subcategoria" className="input" defaultValue={produto?.subcategoria ?? ""} /></div>
          <div><label className="label">Marca</label><input name="marca" className="input" defaultValue={produto?.marca ?? "Glowy Life Nutrition"} /></div>
          <div><label className="label">Modelo</label><input name="modelo" className="input" defaultValue={produto?.modelo ?? ""} /></div>
          <div><label className="label">Código de barras (EAN)</label><input name="codigo_barras" className="input font-mono" defaultValue={produto?.codigo_barras ?? ""} /></div>
          <div><label className="label">Unidade de medida</label>
            <select name="unidade_medida" className="input" defaultValue={produto?.unidade_medida ?? "UN"}><option value="UN">Unidade</option><option value="CX">Caixa</option><option value="KIT">Kit</option><option value="PT">Pote</option><option value="FR">Frasco</option></select></div>
          <div className="md:col-span-2"><label className="label">Descrição detalhada</label><textarea name="descricao" rows={3} className="input" defaultValue={produto?.descricao ?? ""} /></div>
          <div><label className="label">Variação: sabor</label><input name="var_sabor" className="input" defaultValue={produto?.variacoes?.sabor ?? ""} /></div>
          <div><label className="label">Variação: tamanho</label><input name="var_tamanho" className="input" defaultValue={produto?.variacoes?.tamanho ?? ""} placeholder="Ex.: 300g, 60 cáps" /></div>
          <div><label className="label">Variação: cor</label><input name="var_cor" className="input" defaultValue={produto?.variacoes?.cor ?? ""} /></div>
          <div className="flex items-center gap-2 pt-5"><input type="checkbox" name="ativo" id="ativo" defaultChecked={produto?.ativo ?? true} /><label htmlFor="ativo" className="font-semibold">Produto ativo</label></div>
        </div>
      </Secao>

      <Secao titulo="Foto principal">
        <UploadFotos pasta={`produtos/${sku || "novo"}`} onEnviado={(url) => setFoto(url)} rotulo={foto ? "Substituir foto" : "Enviar foto (computador ou celular)"} />
        {foto && (<div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="Foto principal" className="w-24 h-24 object-cover rounded-lg border border-line" />
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setFoto("")}>Remover foto</button>
        </div>)}
        {produto && <p className="text-xs text-muted mt-2">A galeria de imagens adicionais e os anexos ficam na ficha do produto.</p>}
      </Secao>

      <Secao titulo="Informações comerciais">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Fornecedor</label>
            <select name="fornecedor_id" className="input" defaultValue={produto?.fornecedor_id ?? ""}><option value="">Não informado</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
          <div><label className="label">Referência / código do fornecedor</label><input name="referencia_fornecedor" className="input" defaultValue={produto?.referencia_fornecedor ?? ""} /></div>
          <div><label className="label">Custo unitário (R$)</label><input name="custo_unitario" type="number" step="0.01" min={0} className="input" defaultValue={produto?.custo_unitario ?? ""} /></div>
          <div><label className="label">Preço de venda (R$)</label><input name="preco_venda" type="number" step="0.01" min={0} className="input" defaultValue={produto?.preco_venda ?? ""} /></div>
          <div><label className="label">Data da última compra</label><input name="data_ultima_compra" type="date" className="input" defaultValue={produto?.data_ultima_compra ?? ""} /></div>
        </div>
      </Secao>

      <Secao titulo="Estoque por unidade (mínimo e localização física)">
        <div className="grid md:grid-cols-2 gap-3">
          {unidades.filter((u) => u.ativa).map((u) => {
            const s = saldos.find((x) => x.unidade_id === u.id);
            return (
              <div key={u.id} className="border border-line rounded-lg p-3">
                <div className="font-semibold text-navy mb-2">{u.nome} {s && <span className="text-muted font-normal">· saldo atual {s.quantidade}</span>}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Estoque mínimo</label><input name={`minimo__${u.id}`} type="number" min={0} className="input" defaultValue={s?.estoque_minimo ?? 0} /></div>
                  <div><label className="label">Localização (corredor, prateleira)</label><input name={`loc__${u.id}`} className="input" defaultValue={s?.localizacao ?? ""} /></div>
                </div>
              </div>
            );
          })}
        </div>
        {!produto && <p className="text-xs text-muted mt-2">A quantidade inicial é lançada depois, pela tela de movimentações (Entrada), para ficar no histórico.</p>}
      </Secao>

      {campos.length > 0 && (
        <Secao titulo="Campos personalizados">
          <div className="grid md:grid-cols-2 gap-3">
            {campos.map((c) => (
              <div key={c.id}><label className="label">{c.rotulo}</label>
                {c.tipo === "lista" ? (
                  <select name={`extra__${c.chave}`} className="input" defaultValue={extras[c.chave] ?? ""}><option value="">—</option>{(c.opcoes ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
                ) : c.tipo === "booleano" ? (
                  <select name={`extra__${c.chave}`} className="input" defaultValue={extras[c.chave] ?? ""}><option value="">—</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
                ) : (
                  <input name={`extra__${c.chave}`} type={c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text"} className="input" defaultValue={extras[c.chave] ?? ""} />
                )}
              </div>
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Complementares">
        <label className="label">Observações</label>
        <textarea name="observacoes" rows={3} className="input" defaultValue={produto?.observacoes ?? ""} />
      </Secao>

      {aviso && <Aviso tipo={aviso.tipo} msg={aviso.msg} />}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar produto"}</button>
      </div>
    </form>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="card p-5"><h2 className="font-bold text-navy mb-3">{titulo}</h2>{children}</section>;
}
