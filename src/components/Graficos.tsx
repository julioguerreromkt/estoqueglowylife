"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const CORES = ["#152238", "#C9A84C", "#00B856", "#4f6d9a", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ef4444"];

export function GraficoUnidades({ dados }: { dados: { nome: string; quantidade: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ee" vertical={false} />
        <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={48} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Unidades"]} />
        <Bar dataKey="quantidade" fill="#152238" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoCategorias({ dados }: { dados: { nome: string; quantidade: number }[] }) {
  if (!dados.length) return <p className="text-muted text-sm">Nenhum produto com categoria cadastrada ainda. Defina categorias na ficha do produto.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={dados} dataKey="quantidade" nameKey="nome" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {dados.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Unidades"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoHistorico({ dados }: { dados: { dia: string; entradas: number; saidas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ee" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 12 }} width={48} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#00B856" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#C9A84C" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasH({ dados, cor = "#C9A84C" }: { dados: { nome: string; quantidade: number }[]; cor?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 30)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Unidades"]} />
        <Bar dataKey="quantidade" fill={cor} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
