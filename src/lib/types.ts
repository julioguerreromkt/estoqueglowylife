export type Papel = "admin" | "gestor" | "operador" | "consulta";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  unidades_permitidas: string[] | null;
  ativo: boolean;
}

export interface Unidade {
  id: string;
  codigo: string;
  nome: string;
  cidade: string | null;
  ativa: boolean;
  ordem: number;
}

export interface Categoria {
  id: string;
  nome: string;
  categoria_pai_id: string | null;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface CampoPersonalizado {
  id: string;
  chave: string;
  rotulo: string;
  tipo: "texto" | "numero" | "data" | "lista" | "booleano";
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
}

export interface Produto {
  id: string;
  sku: string;
  codigo_interno: string | null;
  nome: string;
  categoria_id: string | null;
  subcategoria: string | null;
  marca: string | null;
  modelo: string | null;
  codigo_barras: string | null;
  descricao: string | null;
  unidade_medida: string;
  variacoes: Record<string, string>;
  ativo: boolean;
  fornecedor_id: string | null;
  referencia_fornecedor: string | null;
  custo_unitario: number | null;
  preco_venda: number | null;
  data_ultima_compra: string | null;
  foto_principal_url: string | null;
  observacoes: string | null;
  campos_extras: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  atualizado_por: string | null;
}

export interface Saldo {
  produto_id: string;
  unidade_id: string;
  quantidade: number;
  reservada: number;
  estoque_minimo: number;
  localizacao: string | null;
}

export interface SaldoProduto {
  produto_id: string;
  sku: string;
  nome: string;
  ativo: boolean;
  categoria_id: string | null;
  categoria: string | null;
  foto_principal_url: string | null;
  custo_unitario: number | null;
  preco_venda: number | null;
  por_unidade: Record<string, number> | null;
  minimo_por_unidade: Record<string, number> | null;
  total: number;
  reservada: number;
  disponivel: number;
  minimo_total: number;
  status_estoque: "NORMAL" | "BAIXO" | "ESGOTADO";
}

export type TipoMov = "ENTRADA" | "SAIDA" | "AJUSTE" | "TRANSF_SAIDA" | "TRANSF_ENTRADA" | "DANIFICADO";

export interface Movimentacao {
  id: number;
  tipo: TipoMov;
  produto_id: string;
  unidade_id: string;
  quantidade: number;
  saldo_anterior: number;
  saldo_resultante: number;
  data_movimento: string;
  data_estimada: boolean;
  motivo: string | null;
  destino: string | null;
  referencia: string | null;
  observacoes: string | null;
  justificativa: string | null;
  transferencia_id: string | null;
  usuario_id: string | null;
  importado: boolean;
  criado_em: string;
  produtos?: { nome: string; sku: string } | null;
  unidades?: { codigo: string; nome: string } | null;
}

export interface Transferencia {
  id: string;
  produto_id: string;
  unidade_origem_id: string;
  unidade_destino_id: string;
  quantidade: number;
  status: "ENVIADA" | "EM_TRANSITO" | "RECEBIDA" | "CANCELADA";
  enviada_em: string;
  em_transito_em: string | null;
  recebida_em: string | null;
  enviado_por: string | null;
  recebido_por: string | null;
  observacoes: string | null;
  produtos?: { nome: string; sku: string } | null;
  origem?: { codigo: string; nome: string } | null;
  destino?: { codigo: string; nome: string } | null;
}

export interface Pendencia {
  id: string;
  produto_id: string;
  unidade_id: string;
  quantidade_divergente: number;
  descricao: string;
  status: "ABERTA" | "RESOLVIDA";
  criado_em: string;
  produtos?: { nome: string; sku: string } | null;
  unidades?: { codigo: string; nome: string } | null;
}

export const TIPO_LABEL: Record<TipoMov, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  TRANSF_SAIDA: "Transf. enviada",
  TRANSF_ENTRADA: "Transf. recebida",
  DANIFICADO: "Danificado",
};

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  operador: "Operador",
  consulta: "Consulta",
};

export function podeMovimentar(p: Papel) {
  return p === "admin" || p === "gestor" || p === "operador";
}
export function podeAjustar(p: Papel) {
  return p === "admin" || p === "gestor";
}
export function ehAdmin(p: Papel) {
  return p === "admin";
}
