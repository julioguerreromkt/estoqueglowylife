# Guia de implantação e manutenção (sem programar)

O sistema já está no ar: **https://estoque.glowylife.com.br**

- Banco de dados, login e fotos: Supabase (projeto `estoque-glowy`, região São Paulo).
- Tela do sistema: Hostinger, hospedagem Node.js, subdomínio `estoque.glowylife.com.br`.
- Código: GitHub, `julioguerreromkt/estoqueglowylife`.

## Variáveis de ambiente usadas

Só duas, as duas públicas por desenho (o que protege os dados é o RLS do banco, não o segredo delas):

- `NEXT_PUBLIC_SUPABASE_URL` = `https://ygeyhtsrskwzysxpdlzv.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave "anon" do projeto

**O sistema não usa a chave `service_role` em lugar nenhum.** A criação de usuário e a
redefinição de senha pelo administrador são feitas por funções dentro do banco
(`admin_criar_usuario`, `admin_redefinir_senha`), que conferem sozinhas se quem chamou é
administrador. Nunca cole a `service_role` em painel de hospedagem, no código ou no chat:
ela ignora todas as regras de acesso.

## Como publicar uma atualização do código

1. O código novo vai para o GitHub (`main`).
2. No painel da Hostinger, hospedagem do `estoque.glowylife.com.br`: **Git** > implantar o
   repositório na pasta `repo`.
3. Ainda na Hostinger: **Node.js** > nova build a partir do arquivo
   `repo/deploy/estoque-glowy.zip`, com Node 22, tipo `next`, pasta de saída `.next`,
   script de build `build`, gerenciador `npm`.
4. A build leva de 2 a 4 minutos. Quando terminar, o site já está com a versão nova.

Observação técnica: a build roda com webpack (`next build --webpack`) porque o Turbopack
quebrou no ambiente da Hostinger ao processar o CSS.

## Banco de dados

A estrutura completa está em `supabase/migrations/`, na ordem em que foi aplicada:

| Arquivo | O que contém |
|---|---|
| `20261012181140_modelo_estoque_v1.sql` | 12 tabelas, funções de permissão, gatilhos de auditoria, operações de estoque, transferências, view do catálogo, RLS, storage e as unidades Sede e Aracaju |
| `20261012193849_funcoes_admin_usuarios.sql` | Criação de usuário e redefinição de senha pelo administrador, direto no banco |
| `20261012200130_fix_protecao_quantidade.sql` | Correção da trava que impede alterar quantidade fora de uma movimentação |

## Backup e recuperação

O que existe hoje, com o plano Free do Supabase:

- Backup automático diário do banco, mantido pelo próprio Supabase, com retenção curta
  (Point-in-Time Recovery exige plano pago).
- Exportação manual: **Relatórios** > Posição de estoque e Movimentações, em Excel ou CSV.
  Guardar esses dois arquivos uma vez por semana numa pasta do Drive já cobre o pior caso.

O que ainda **não** existe e precisa de decisão sua: rotina automática de backup fora do
Supabase e teste periódico de restauração. Está na lista de pendências do boletim.

## Seu acesso

- E-mail: supernegociohoje@gmail.com
- Senha inicial temporária entregue no chat. **Troque no primeiro acesso**, em
  Usuários e Configurações > Minha conta.
