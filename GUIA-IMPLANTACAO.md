# Guia de implantação (passo a passo, sem programar)

O banco já está no ar no Supabase. Falta só publicar a tela na Vercel. São 3 blocos.

## Bloco 1 · Criar o repositório no GitHub (2 minutos)

1. Abra https://github.com/new no navegador, logado na conta `julioguerreromkt`.
2. Em **Repository name**, digite: `glowy-estoque`
3. Marque **Private**.
4. NÃO marque "Add a README" nem ".gitignore".
5. Clique no botão verde **Create repository**.
6. Me avise aqui no chat que criou. Eu envio o código para dentro dele.

## Bloco 2 · Pegar a chave de serviço no Supabase (1 minuto)

Essa chave é o que permite ao administrador criar usuários pela tela do sistema. Ela nunca vai para o navegador, só para o servidor da Vercel.

1. Abra https://supabase.com/dashboard/project/ygeyhtsrskwzysxpdlzv/settings/api-keys
2. Procure a chave chamada **service_role** (ou "Secret keys" > "service_role"). Clique em **Reveal** e depois em **Copy**.
3. Guarde num bloco de notas por 5 minutos. Você vai colar na Vercel no bloco 3. Não cole aqui no chat.

## Bloco 3 · Publicar na Vercel (5 minutos)

1. Abra https://vercel.com/signup e entre com **Continue with GitHub** (use a mesma conta do GitHub). Se já tem conta, abra https://vercel.com/new
2. Na tela **Import Git Repository**, encontre `glowy-estoque` e clique em **Import**. Se não aparecer, clique em "Adjust GitHub App Permissions" e libere o repositório.
3. Deixe **Framework Preset** em Next.js (vem automático).
4. Abra a seção **Environment Variables** e cole, uma por linha:
   - Nome `NEXT_PUBLIC_SUPABASE_URL` · Valor `https://ygeyhtsrskwzysxpdlzv.supabase.co`
   - Nome `NEXT_PUBLIC_SUPABASE_ANON_KEY` · Valor: a chave "anon" (está no mesmo painel de API Keys do Supabase, aba "Legacy anon key", ou eu mando aqui no chat, ela é pública)
   - Nome `SUPABASE_SERVICE_ROLE_KEY` · Valor: a chave do bloco 2
5. Clique em **Deploy**. Espere uns 2 minutos até aparecer "Congratulations".
6. Clique em **Visit**. O endereço será algo como `https://glowy-estoque.vercel.app`. Esse é o link do sistema.
7. Me mande o link aqui. Eu entro, testo cada tela e devolvo o boletim.

## Depois (opcional)

- Domínio próprio, ex.: `estoque.glowylife.com.br`: na Vercel, Settings > Domains > Add. Ela mostra o registro CNAME para criar no painel da Hostinger.
- Toda vez que eu atualizar o código no GitHub, a Vercel publica sozinha em 2 minutos.

## Seu acesso

- E-mail: supernegociohoje@gmail.com
- Senha inicial: `Glowy2026!Estoque` (troque no primeiro acesso em Usuários e Configurações > Minha conta)
