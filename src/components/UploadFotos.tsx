"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload } from "lucide-react";

export default function UploadFotos({ pasta, onEnviado, rotulo = "Enviar foto", aceitar = "image/*", multiplo = false }: {
  pasta: string; onEnviado: (url: string, caminho: string, nome: string) => void | Promise<void>; rotulo?: string; aceitar?: string; multiplo?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(files: FileList | null) {
    if (!files || !files.length) return;
    setEnviando(true); setErro(null);
    const supabase = createClient();
    try {
      for (const f of Array.from(files)) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: arquivo maior que 10 MB`);
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
        const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("produtos").upload(caminho, f, { cacheControl: "3600", upsert: false, contentType: f.type || undefined });
        if (error) throw error;
        const { data } = supabase.storage.from("produtos").getPublicUrl(caminho);
        await onEnviado(data.publicUrl, caminho, f.name);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setEnviando(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept={aceitar} multiple={multiplo} className="hidden" onChange={(e) => enviar(e.target.files)} capture={aceitar.startsWith("image") ? undefined : undefined} />
      <button type="button" className="btn btn-outline" onClick={() => ref.current?.click()} disabled={enviando}>
        <Upload size={16} /> {enviando ? "Enviando..." : rotulo}
      </button>
      {erro && <p className="text-red text-sm mt-1">{erro}</p>}
    </div>
  );
}
