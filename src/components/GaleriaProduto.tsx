"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import UploadFotos from "@/components/UploadFotos";
import { salvarImagemProduto, removerImagemProduto, salvarAnexoProduto, removerAnexo } from "@/app/actions/cadastros";
import { Paperclip, Trash2 } from "lucide-react";

interface Img { id: string; url: string; caminho_storage: string | null }
interface Anexo { id: string; nome: string; url: string; caminho_storage: string | null; criado_em: string }

export default function GaleriaProduto({ produtoId, sku, fotoPrincipal, imagens, anexos, podeEditar }: {
  produtoId: string; sku: string; fotoPrincipal: string | null; imagens: Img[]; anexos: Anexo[]; podeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-navy mb-2">Fotos</h3>
        <div className="flex flex-wrap gap-3">
          {fotoPrincipal && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoPrincipal} alt="Foto principal" className="w-28 h-28 object-cover rounded-lg border-2 border-gold" />
              <span className="absolute bottom-1 left-1 badge badge-baixo">principal</span>
              {podeEditar && <button className="absolute top-1 right-1 bg-white rounded p-1 shadow" title="Remover" onClick={() => run(() => removerImagemProduto(produtoId, null, null))} disabled={pending}><Trash2 size={14} /></button>}
            </div>
          )}
          {imagens.map((i) => (
            <div key={i.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.url} alt="" className="w-28 h-28 object-cover rounded-lg border border-line" />
              {podeEditar && (<>
                <button className="absolute top-1 right-1 bg-white rounded p-1 shadow" title="Excluir" onClick={() => run(() => removerImagemProduto(produtoId, i.id, i.caminho_storage))} disabled={pending}><Trash2 size={14} /></button>
                <button className="absolute bottom-1 left-1 bg-white rounded px-1 text-[10px] shadow font-semibold" onClick={() => run(() => salvarImagemProduto(produtoId, i.url, i.caminho_storage ?? "", true))} disabled={pending}>tornar principal</button>
              </>)}
            </div>
          ))}
          {!fotoPrincipal && imagens.length === 0 && <p className="text-muted text-sm">Nenhuma foto cadastrada.</p>}
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2 mt-3">
            {!fotoPrincipal && <UploadFotos pasta={`produtos/${sku}`} rotulo="Enviar foto principal" onEnviado={(url, caminho) => run(() => salvarImagemProduto(produtoId, url, caminho, true))} />}
            <UploadFotos pasta={`produtos/${sku}/galeria`} rotulo="Adicionar à galeria" multiplo onEnviado={(url, caminho) => run(() => salvarImagemProduto(produtoId, url, caminho, false))} />
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-navy mb-2">Documentos anexos</h3>
        <ul className="space-y-1 text-sm">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-2"><Paperclip size={14} /><a href={a.url} target="_blank" className="text-navy underline" rel="noreferrer">{a.nome}</a>
              {podeEditar && <button className="text-red text-xs" onClick={() => run(() => removerAnexo(produtoId, a.id, a.caminho_storage))} disabled={pending}>excluir</button>}</li>
          ))}
          {anexos.length === 0 && <li className="text-muted">Nenhum anexo.</li>}
        </ul>
        {podeEditar && <div className="mt-2"><UploadFotos pasta={`produtos/${sku}/anexos`} rotulo="Anexar documento (PDF, imagem, NF)" aceitar="*/*" multiplo onEnviado={(url, caminho, nome) => run(() => salvarAnexoProduto(produtoId, nome, url, caminho))} /></div>}
      </div>
    </div>
  );
}
