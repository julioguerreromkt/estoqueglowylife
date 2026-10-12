"use client";

import { useState, useTransition } from "react";
import { entrar } from "@/app/actions/cadastros";

export default function LoginForm() {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await entrar(fd);
      if (r.ok) window.location.assign("/");
      else setErro(r.erro);
    });
  }
  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required className="input" autoComplete="current-password" />
      </div>
      {erro && <p className="text-red text-sm font-medium" role="alert">{erro}</p>}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
