"use client";
import { sair } from "@/app/actions/cadastros";
export default function BotaoSair() {
  return <button className="btn btn-outline mt-4" onClick={() => sair().then(() => window.location.assign("/login"))}>Sair</button>;
}
