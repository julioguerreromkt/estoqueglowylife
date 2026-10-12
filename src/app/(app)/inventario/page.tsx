import { getPendencias, getSaldosProduto, getSessao, getUnidades } from "@/lib/data";
import Inventario from "@/components/Inventario";

export default async function InventarioPage() {
  const { perfil } = await getSessao();
  const [pendencias, saldos, unidades] = await Promise.all([getPendencias(), getSaldosProduto(), getUnidades()]);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-navy">Inventário</h1><p className="text-muted">Pendências e contagem física por unidade</p></div>
      <Inventario pendencias={pendencias} saldos={saldos} unidades={unidades} papel={perfil!.papel} />
    </div>
  );
}
