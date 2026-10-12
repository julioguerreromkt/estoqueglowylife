# Estoque Glowy Life

Sistema web de gestão de estoque multiunidades da Glowy Life (Sede e Aracaju), substituto da planilha CONTROLE - GLOWY LIFE.

- Banco, login, fotos e regras de acesso: Supabase (projeto `estoque-glowy`, região São Paulo)
- Aplicação: Next.js 16 (App Router, TypeScript, Tailwind)
- Hospedagem: Vercel

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
- `supabase/migrations/` modelo do banco (referência; já aplicado no projeto)

## Regras de estoque garantidas pelo banco

- Estoque nunca fica negativo em lançamento novo.
- Toda movimentação grava saldo anterior, quantidade, saldo resultante, usuário e data.
- Ajuste de inventário exige justificativa e perfil Gestor ou Administrador.
- Transferência em 3 etapas (enviada, em trânsito, recebida): a quantidade em trânsito não conta em nenhuma unidade.
- Acesso por perfil (Administrador, Gestor, Operador, Consulta) e por unidade.

Veja `GUIA-IMPLANTACAO.md` para colocar no ar e `GUIA-OPERACAO.md` para o dia a dia.
