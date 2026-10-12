import Link from "next/link";
export default function NotFound() {
  return <main className="min-h-screen flex items-center justify-center"><div className="card p-8 text-center"><h1 className="text-xl font-bold text-navy">Página não encontrada</h1><Link href="/" className="btn btn-primary mt-4">Voltar ao dashboard</Link></div></main>;
}
