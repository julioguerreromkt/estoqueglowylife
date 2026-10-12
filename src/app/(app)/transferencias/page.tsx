import { getSaldosProduto, getSessao, getTransferencias, getUnidades } from "@/lib/data";
import Transferencias from "@/components/Transferencias";

export default async function TransferenciasPage() {
  const { perfil } = await getSessao();
  const [lista, saldos, unidades] = await Promise.all([getTransferencias(), getSaldosProduto(), getUnidades()]);
  const opcoes = saldos.filter((s) => s.ativo).map((s) => ({ id: s.produto_id, nome: s.nome, sku: s.sku, por_unidade: s.por_unidade }));
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-navy">Transferências entre unidades</h1><p className="text-muted">Envio, trânsito e recebimento, sem contagem duplicada</p></div>
      <Transferencias lista={lista} papel={perfil!.papel} produtos={opcoes} unidades={unidades} />
    </div>
  );
}
