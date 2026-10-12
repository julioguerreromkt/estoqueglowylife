-- =====================================================================
-- GLOWY LIFE · SISTEMA DE ESTOQUE MULTIUNIDADES · modelo v1
-- Aplicada em 12/10/2026 no projeto Supabase estoque-glowy.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- UNIDADES ----------
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  cidade text,
  ativa boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------- PERFIS DE USUÁRIO ----------
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null,
  papel text not null default 'consulta' check (papel in ('admin','gestor','operador','consulta')),
  unidades_permitidas uuid[] null,          -- null = todas as unidades
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- CATEGORIAS / FORNECEDORES ----------
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_pai_id uuid references public.categorias(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (nome, categoria_pai_id)
);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  contato text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------- CAMPOS PERSONALIZADOS (definição) ----------
create table public.campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  rotulo text not null,
  tipo text not null default 'texto' check (tipo in ('texto','numero','data','lista','booleano')),
  opcoes jsonb,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------- PRODUTOS ----------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  codigo_interno text unique,
  nome text not null,
  categoria_id uuid references public.categorias(id) on delete set null,
  subcategoria text,
  marca text,
  modelo text,
  codigo_barras text,
  descricao text,
  unidade_medida text not null default 'UN',
  variacoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  referencia_fornecedor text,
  custo_unitario numeric(12,2),
  preco_venda numeric(12,2),
  data_ultima_compra date,
  foto_principal_url text,
  observacoes text,
  campos_extras jsonb not null default '{}'::jsonb,
  origem_importacao text,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);
create index produtos_nome_idx on public.produtos using gin (to_tsvector('portuguese', coalesce(nome,'') || ' ' || coalesce(descricao,'') || ' ' || coalesce(sku,'')));

create table public.produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  caminho_storage text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.produto_anexos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome text not null,
  url text not null,
  caminho_storage text,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);

-- ---------- SALDOS POR UNIDADE ----------
create table public.saldos (
  produto_id uuid not null references public.produtos(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete restrict,
  quantidade int not null default 0 check (quantidade >= 0),
  reservada int not null default 0 check (reservada >= 0),
  estoque_minimo int not null default 0 check (estoque_minimo >= 0),
  localizacao text,
  atualizado_em timestamptz not null default now(),
  primary key (produto_id, unidade_id)
);

-- ---------- TRANSFERÊNCIAS ----------
create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id),
  unidade_origem_id uuid not null references public.unidades(id),
  unidade_destino_id uuid not null references public.unidades(id),
  quantidade int not null check (quantidade > 0),
  status text not null default 'ENVIADA' check (status in ('ENVIADA','EM_TRANSITO','RECEBIDA','CANCELADA')),
  enviada_em timestamptz not null default now(),
  em_transito_em timestamptz,
  recebida_em timestamptz,
  enviado_por uuid references auth.users(id),
  recebido_por uuid references auth.users(id),
  observacoes text,
  check (unidade_origem_id <> unidade_destino_id)
);

-- ---------- MOVIMENTAÇÕES (histórico auditável) ----------
create table public.movimentacoes (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('ENTRADA','SAIDA','AJUSTE','TRANSF_SAIDA','TRANSF_ENTRADA','DANIFICADO')),
  produto_id uuid not null references public.produtos(id),
  unidade_id uuid not null references public.unidades(id),
  quantidade int not null,                 -- sempre positiva; o sinal vem do tipo
  saldo_anterior int not null,
  saldo_resultante int not null,
  data_movimento date not null default current_date,
  data_estimada boolean not null default false,
  motivo text,
  destino text,                            -- consultor, cliente, pedido, local
  referencia text,                         -- nº do pedido, NF
  observacoes text,
  justificativa text,
  transferencia_id uuid references public.transferencias(id),
  usuario_id uuid references auth.users(id),
  importado boolean not null default false,
  linha_origem text,
  criado_em timestamptz not null default now()
);
create index mov_produto_idx on public.movimentacoes (produto_id, data_movimento desc);
create index mov_unidade_idx on public.movimentacoes (unidade_id, data_movimento desc);
create index mov_data_idx on public.movimentacoes (data_movimento desc);

-- ---------- PENDÊNCIAS DE INVENTÁRIO ----------
create table public.pendencias_inventario (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id),
  unidade_id uuid not null references public.unidades(id),
  quantidade_divergente int not null,
  descricao text not null,
  status text not null default 'ABERTA' check (status in ('ABERTA','RESOLVIDA')),
  resolvida_em timestamptz,
  resolvida_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- FUNÇÕES AUXILIARES DE PERMISSÃO
-- =====================================================================
create or replace function public.papel_atual() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select papel from public.perfis where id = auth.uid() and ativo), 'nenhum');
$$;

create or replace function public.pode_unidade(p_unidade uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.ativo
      and (p.unidades_permitidas is null or p_unidade = any(p.unidades_permitidas))
  );
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.papel_atual() = 'admin';
$$;

-- =====================================================================
-- GATILHOS DE AUDITORIA
-- =====================================================================
create or replace function public.tg_set_atualizado() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  if to_jsonb(new) ? 'atualizado_por' then new.atualizado_por := auth.uid(); end if;
  return new;
end $$;
create trigger produtos_atualizado before update on public.produtos for each row execute function public.tg_set_atualizado();
create trigger perfis_atualizado before update on public.perfis for each row execute function public.tg_set_atualizado();

create or replace function public.tg_produto_criado() returns trigger
language plpgsql as $$
begin
  if new.criado_por is null then new.criado_por := auth.uid(); end if;
  if new.atualizado_por is null then new.atualizado_por := auth.uid(); end if;
  return new;
end $$;
create trigger produtos_criado before insert on public.produtos for each row execute function public.tg_produto_criado();

-- Cria saldos zerados para cada unidade ativa quando um produto nasce, e para cada produto quando uma unidade nasce
create or replace function public.tg_saldos_novo_produto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.saldos (produto_id, unidade_id)
  select new.id, u.id from public.unidades u where u.ativa
  on conflict do nothing;
  return new;
end $$;
create trigger produtos_saldos after insert on public.produtos for each row execute function public.tg_saldos_novo_produto();

create or replace function public.tg_saldos_nova_unidade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.saldos (produto_id, unidade_id)
  select p.id, new.id from public.produtos p
  on conflict do nothing;
  return new;
end $$;
create trigger unidades_saldos after insert on public.unidades for each row execute function public.tg_saldos_nova_unidade();

-- Perfil automático ao criar usuário no Auth (papel vem do metadata ou 'consulta')
create or replace function public.tg_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_papel text; v_nome text; v_unidades uuid[];
begin
  v_papel := coalesce(new.raw_user_meta_data->>'papel', 'consulta');
  v_nome  := coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1));
  if new.raw_user_meta_data ? 'unidades_permitidas' then
    select array_agg(x::uuid) into v_unidades from jsonb_array_elements_text(new.raw_user_meta_data->'unidades_permitidas') x;
  end if;
  insert into public.perfis (id, nome, email, papel, unidades_permitidas, ativo)
  values (new.id, v_nome, new.email, v_papel, v_unidades, coalesce((new.raw_user_meta_data->>'ativo')::boolean, true))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.tg_novo_usuario();

-- =====================================================================
-- OPERAÇÕES DE ESTOQUE (integridade transacional, sem negativo)
-- Versão final desta função: ver 20261012200130_fix_protecao_quantidade.sql
-- =====================================================================
create or replace function public.registrar_movimentacao(
  p_tipo text, p_produto uuid, p_unidade uuid, p_quantidade int,
  p_data date default current_date, p_motivo text default null, p_destino text default null,
  p_referencia text default null, p_observacoes text default null, p_justificativa text default null,
  p_transferencia uuid default null, p_importado boolean default false, p_linha_origem text default null,
  p_data_estimada boolean default false, p_usuario uuid default null
) returns public.movimentacoes
language plpgsql security definer set search_path = public as $$
declare v_ant int; v_res int; v_mov public.movimentacoes; v_papel text; v_uid uuid;
begin
  v_uid := coalesce(p_usuario, auth.uid());
  if not p_importado then
    v_papel := public.papel_atual();
    if v_papel not in ('admin','gestor','operador') then raise exception 'Sem permissão para movimentar estoque'; end if;
    if not public.pode_unidade(p_unidade) then raise exception 'Sem acesso a esta unidade'; end if;
    if p_tipo = 'AJUSTE' and v_papel not in ('admin','gestor') then raise exception 'Ajuste de inventário exige Gestor ou Administrador'; end if;
  end if;
  if p_tipo = 'AJUSTE' and coalesce(p_justificativa,'') = '' then raise exception 'Ajuste de inventário exige justificativa'; end if;
  if p_tipo <> 'AJUSTE' and p_quantidade <= 0 then raise exception 'Quantidade deve ser maior que zero'; end if;

  insert into public.saldos (produto_id, unidade_id) values (p_produto, p_unidade) on conflict do nothing;
  select quantidade into v_ant from public.saldos where produto_id = p_produto and unidade_id = p_unidade for update;

  v_res := case p_tipo
    when 'ENTRADA' then v_ant + p_quantidade
    when 'TRANSF_ENTRADA' then v_ant + p_quantidade
    when 'SAIDA' then v_ant - p_quantidade
    when 'TRANSF_SAIDA' then v_ant - p_quantidade
    when 'DANIFICADO' then v_ant - p_quantidade
    when 'AJUSTE' then p_quantidade            -- em ajuste, p_quantidade é a quantidade FÍSICA contada
    else null end;
  if v_res is null then raise exception 'Tipo de movimentação inválido: %', p_tipo; end if;
  if v_res < 0 then raise exception 'Operação deixaria o estoque negativo (saldo atual %, solicitado %)', v_ant, p_quantidade; end if;

  update public.saldos set quantidade = v_res, atualizado_em = now() where produto_id = p_produto and unidade_id = p_unidade;

  insert into public.movimentacoes (tipo, produto_id, unidade_id, quantidade, saldo_anterior, saldo_resultante, data_movimento, data_estimada,
    motivo, destino, referencia, observacoes, justificativa, transferencia_id, usuario_id, importado, linha_origem)
  values (p_tipo, p_produto, p_unidade, case when p_tipo='AJUSTE' then abs(v_res - v_ant) else p_quantidade end, v_ant, v_res, p_data, p_data_estimada,
    p_motivo, p_destino, p_referencia, p_observacoes, p_justificativa, p_transferencia, v_uid, p_importado, p_linha_origem)
  returning * into v_mov;
  return v_mov;
end $$;

-- Transferência etapa 1: envio (debita origem; mercadoria fica "em trânsito", fora dos dois saldos)
create or replace function public.criar_transferencia(
  p_produto uuid, p_origem uuid, p_destino uuid, p_quantidade int, p_observacoes text default null
) returns public.transferencias
language plpgsql security definer set search_path = public as $$
declare v_t public.transferencias;
begin
  if public.papel_atual() not in ('admin','gestor','operador') then raise exception 'Sem permissão'; end if;
  if not public.pode_unidade(p_origem) then raise exception 'Sem acesso à unidade de origem'; end if;
  insert into public.transferencias (produto_id, unidade_origem_id, unidade_destino_id, quantidade, status, enviado_por, observacoes)
  values (p_produto, p_origem, p_destino, p_quantidade, 'EM_TRANSITO', auth.uid(), p_observacoes) returning * into v_t;
  update public.transferencias set em_transito_em = now() where id = v_t.id;
  perform public.registrar_movimentacao('TRANSF_SAIDA', p_produto, p_origem, p_quantidade, current_date,
    'Transferência enviada', (select nome from public.unidades where id = p_destino), v_t.id::text, p_observacoes, null, v_t.id);
  select * into v_t from public.transferencias where id = v_t.id;
  return v_t;
end $$;

-- Transferência etapa 2: recebimento (credita destino)
create or replace function public.receber_transferencia(p_transferencia uuid, p_quantidade_recebida int default null, p_observacoes text default null)
returns public.transferencias
language plpgsql security definer set search_path = public as $$
declare v_t public.transferencias; v_q int;
begin
  if public.papel_atual() not in ('admin','gestor','operador') then raise exception 'Sem permissão'; end if;
  select * into v_t from public.transferencias where id = p_transferencia for update;
  if v_t.status <> 'EM_TRANSITO' then raise exception 'Transferência não está em trânsito (status %)', v_t.status; end if;
  if not public.pode_unidade(v_t.unidade_destino_id) then raise exception 'Sem acesso à unidade de destino'; end if;
  v_q := coalesce(p_quantidade_recebida, v_t.quantidade);
  if v_q > v_t.quantidade or v_q < 0 then raise exception 'Quantidade recebida inválida'; end if;
  perform public.registrar_movimentacao('TRANSF_ENTRADA', v_t.produto_id, v_t.unidade_destino_id, v_q, current_date,
    'Transferência recebida', (select nome from public.unidades where id = v_t.unidade_origem_id), v_t.id::text, p_observacoes, null, v_t.id);
  if v_q < v_t.quantidade then
    insert into public.pendencias_inventario (produto_id, unidade_id, quantidade_divergente, descricao)
    values (v_t.produto_id, v_t.unidade_destino_id, v_q - v_t.quantidade,
      format('Transferência %s: enviadas %s, recebidas %s', v_t.id, v_t.quantidade, v_q));
  end if;
  update public.transferencias set status = 'RECEBIDA', recebida_em = now(), recebido_por = auth.uid(),
    observacoes = coalesce(p_observacoes, observacoes) where id = p_transferencia returning * into v_t;
  return v_t;
end $$;

-- Cancelamento de transferência em trânsito (devolve à origem)
create or replace function public.cancelar_transferencia(p_transferencia uuid, p_motivo text)
returns public.transferencias
language plpgsql security definer set search_path = public as $$
declare v_t public.transferencias;
begin
  if public.papel_atual() not in ('admin','gestor') then raise exception 'Cancelar exige Gestor ou Administrador'; end if;
  select * into v_t from public.transferencias where id = p_transferencia for update;
  if v_t.status <> 'EM_TRANSITO' then raise exception 'Só é possível cancelar transferência em trânsito'; end if;
  perform public.registrar_movimentacao('TRANSF_ENTRADA', v_t.produto_id, v_t.unidade_origem_id, v_t.quantidade, current_date,
    'Transferência cancelada: ' || p_motivo, null, v_t.id::text, null, null, v_t.id);
  update public.transferencias set status = 'CANCELADA', observacoes = coalesce(observacoes,'') || ' | Cancelada: ' || p_motivo
    where id = p_transferencia returning * into v_t;
  return v_t;
end $$;

-- =====================================================================
-- VISÕES PARA CATÁLOGO E DASHBOARD
-- =====================================================================
create or replace view public.v_saldos_produto with (security_invoker = true) as
select p.id as produto_id, p.sku, p.nome, p.ativo, p.categoria_id, c.nome as categoria, p.foto_principal_url, p.custo_unitario, p.preco_venda,
  jsonb_object_agg(u.codigo, s.quantidade) filter (where u.id is not null) as por_unidade,
  jsonb_object_agg(u.codigo, s.estoque_minimo) filter (where u.id is not null) as minimo_por_unidade,
  coalesce(sum(s.quantidade),0)::int as total,
  coalesce(sum(s.reservada),0)::int as reservada,
  (coalesce(sum(s.quantidade),0) - coalesce(sum(s.reservada),0))::int as disponivel,
  coalesce(sum(s.estoque_minimo),0)::int as minimo_total,
  case when coalesce(sum(s.quantidade),0) = 0 then 'ESGOTADO'
       when coalesce(sum(s.quantidade),0) <= coalesce(sum(s.estoque_minimo),0) and coalesce(sum(s.estoque_minimo),0) > 0 then 'BAIXO'
       else 'NORMAL' end as status_estoque
from public.produtos p
left join public.categorias c on c.id = p.categoria_id
left join public.saldos s on s.produto_id = p.id
left join public.unidades u on u.id = s.unidade_id and u.ativa
group by p.id, c.nome;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.unidades enable row level security;
alter table public.perfis enable row level security;
alter table public.categorias enable row level security;
alter table public.fornecedores enable row level security;
alter table public.campos_personalizados enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_imagens enable row level security;
alter table public.produto_anexos enable row level security;
alter table public.saldos enable row level security;
alter table public.transferencias enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.pendencias_inventario enable row level security;

-- leitura: todo usuário ativo
create policy "ler unidades" on public.unidades for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler categorias" on public.categorias for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler fornecedores" on public.fornecedores for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler campos" on public.campos_personalizados for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler produtos" on public.produtos for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler imagens" on public.produto_imagens for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler anexos" on public.produto_anexos for select to authenticated using (public.papel_atual() <> 'nenhum');
create policy "ler saldos" on public.saldos for select to authenticated using (public.pode_unidade(unidade_id));
create policy "ler movimentacoes" on public.movimentacoes for select to authenticated using (public.pode_unidade(unidade_id));
create policy "ler transferencias" on public.transferencias for select to authenticated using (public.pode_unidade(unidade_origem_id) or public.pode_unidade(unidade_destino_id));
create policy "ler pendencias" on public.pendencias_inventario for select to authenticated using (public.pode_unidade(unidade_id));
create policy "ler perfis" on public.perfis for select to authenticated using (id = auth.uid() or public.eh_admin());

-- escrita de cadastros: admin, gestor, operador
create policy "editar produtos" on public.produtos for all to authenticated
  using (public.papel_atual() in ('admin','gestor','operador')) with check (public.papel_atual() in ('admin','gestor','operador'));
create policy "editar imagens" on public.produto_imagens for all to authenticated
  using (public.papel_atual() in ('admin','gestor','operador')) with check (public.papel_atual() in ('admin','gestor','operador'));
create policy "editar anexos" on public.produto_anexos for all to authenticated
  using (public.papel_atual() in ('admin','gestor','operador')) with check (public.papel_atual() in ('admin','gestor','operador'));
create policy "editar categorias" on public.categorias for all to authenticated
  using (public.papel_atual() in ('admin','gestor','operador')) with check (public.papel_atual() in ('admin','gestor','operador'));
create policy "editar fornecedores" on public.fornecedores for all to authenticated
  using (public.papel_atual() in ('admin','gestor','operador')) with check (public.papel_atual() in ('admin','gestor','operador'));
-- saldos: só mínimo/localização/reserva podem ser editados direto; quantidade só via função
create policy "editar saldos" on public.saldos for update to authenticated
  using (public.papel_atual() in ('admin','gestor') and public.pode_unidade(unidade_id))
  with check (public.papel_atual() in ('admin','gestor') and public.pode_unidade(unidade_id));
create policy "resolver pendencias" on public.pendencias_inventario for update to authenticated
  using (public.papel_atual() in ('admin','gestor')) with check (public.papel_atual() in ('admin','gestor'));
-- configuração: só admin
create policy "admin unidades" on public.unidades for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin campos" on public.campos_personalizados for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin perfis" on public.perfis for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- proteger a coluna quantidade de edição direta
-- (versão corrigida em 20261012200130_fix_protecao_quantidade.sql)
create or replace function public.tg_protege_quantidade() returns trigger
language plpgsql as $$
begin
  if new.quantidade <> old.quantidade and current_setting('role', true) = 'authenticated' then
    raise exception 'A quantidade só pode ser alterada por movimentação (entrada, saída, ajuste ou transferência)';
  end if;
  return new;
end $$;
create trigger saldos_protege before update on public.saldos for each row execute function public.tg_protege_quantidade();

-- =====================================================================
-- STORAGE: fotos e anexos de produtos
-- =====================================================================
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true) on conflict do nothing;
create policy "fotos publicas" on storage.objects for select using (bucket_id = 'produtos');
create policy "upload fotos" on storage.objects for insert to authenticated with check (bucket_id = 'produtos' and public.papel_atual() in ('admin','gestor','operador'));
create policy "atualizar fotos" on storage.objects for update to authenticated using (bucket_id = 'produtos' and public.papel_atual() in ('admin','gestor','operador'));
create policy "apagar fotos" on storage.objects for delete to authenticated using (bucket_id = 'produtos' and public.papel_atual() in ('admin','gestor','operador'));

-- =====================================================================
-- DADOS BASE: as duas unidades atuais
-- =====================================================================
insert into public.unidades (codigo, nome, cidade, ordem) values
  ('SEDE', 'Sede', null, 1),
  ('ARACAJU', 'Aracaju', 'Aracaju', 2);
