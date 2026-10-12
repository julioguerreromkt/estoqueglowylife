# Estoque Glowy Life

Sistema web de gestão de estoque multiunidades da Glowy Life (Sede e Aracaju), substituto da planilha CONTROLE - GLOWY LIFE.

- Banco, login, fotos e regras de acesso: Supabase (projeto `estoque-glowy`, região São Paulo)
- Aplicação: Next.js 16 (App Router, TypeScript, Tailwind)
- Hospedagem: Hostinger (Node.js), em https://estoque.glowylife.com.br

## Como rodar no seu computador (opcional)

1. Instale o Node.js 22 ou superior.
2. Copie `.env.example` para `.env.local` e preencha as chaves (estão no painel do Supabase, em Project Settings > API Keys).
3. `npm install` e depois `npm run dev`. Abra http://localhost:3000.

## Estrutura

- `src/app/(app)/` telas: dashboard, produtos, estoque por unidade, movimentações, transferências, inventário, fornecedores, relatórios, configurações
- `src/app/actions/` gravações no banco (server actions)
- `src/app/api/exportar/` exportação Excel e CSV
- `src/lib/` acesso a dados, tipos e formatação
- `src/components/` componentes de tela
- `supabase/migrations/` SQL do banco, na ordem em que foi aplicado no projeto

## Regras de estoque garantidas pelo banco

Todas estas valem no banco, não só na tela: estão nas funções `registrar_movimentacao`,
`criar_transferencia`, `receber_transferencia` e `cancelar_transferencia` e nas políticas RLS.

- Estoque nunca fica negativo em lançamento novo.
- Toda movimentação grava saldo anterior, quantidade, saldo resultante, usuário e data.
- Ajuste de inventário exige justificativa, e perfil Gestor ou Administrador.
- Transferência: ao enviar, a quantidade sai da origem e fica **em trânsito**, fora dos dois
  saldos, até alguém confirmar o recebimento no destino. Nada é contado duas vezes.
  Na prática são duas confirmações humanas: enviar e receber. O status `ENVIADA` existe no
  modelo mas não é usado: o envio já nasce `EM_TRANSITO`.
- Acesso por perfil (Administrador, Gestor, Operador, Consulta) e por unidade: quem tem
  unidade restrita não lê nem movimenta saldo, movimentação ou transferência de outra unidade
  (o bloqueio é do banco). A tela ainda mostra o menu das outras unidades; a lista aparece vazia
  e a gravação é recusada.

## Limitações conhecidas

Registradas no boletim de entrega de 12/10/2026, ainda não corrigidas: filtros de unidade e
produto do dashboard afetam os gráficos, não os indicadores do topo; transferência interna
soma como entrada e como saída nos indicadores de 30 dias; "quantidade reservada" existe no
modelo mas nenhuma tela grava; conferência pré-importação é uma prévia de 5 linhas, sem
agregação por unidade; contagem de inventário e importação gravam linha a linha, sem desfazer
o que já entrou se uma linha falhar.

Veja `GUIA-IMPLANTACAO.md` para colocar no ar e `GUIA-OPERACAO.md` para o dia a dia.
