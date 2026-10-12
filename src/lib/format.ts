export function brl(v: number | null | undefined) {
  if (v === null || v === undefined) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR");
}

export function dataBr(iso: string | null | undefined) {
  if (!iso) return "";
  const d = iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function dataHoraBr(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function hoje() {
  const d = new Date();
  const tz = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return tz.toISOString().slice(0, 10);
}

export function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function slugSku(nome: string) {
  return nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
