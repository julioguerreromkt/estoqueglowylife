-- Correção: a trava da coluna quantidade disparava dentro da própria função de movimentação,
-- porque current_setting('role') continua 'authenticated' dentro de uma função security definer.
-- Passa a usar uma marca de sessão setada só durante a atualização feita pela função.
-- Aplicada em 12/10/2026.
create or replace function public.tg_protege_quantidade() returns trigger
language plpgsql as $$
begin
  if new.quantidade <> old.quantidade and coalesce(current_setting('estoque.via_funcao', true), '') <> '1' then
    raise exception 'A quantidade só pode ser alterada por movimentação (entrada, saída, ajuste ou transferência)';
  end if;
  return new;
end $$;

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
    when 'AJUSTE' then p_quantidade
    else null end;
  if v_res is null then raise exception 'Tipo de movimentação inválido: %', p_tipo; end if;
  if v_res < 0 then raise exception 'Operação deixaria o estoque negativo (saldo atual %, solicitado %)', v_ant, p_quantidade; end if;

  perform set_config('estoque.via_funcao', '1', true);
  update public.saldos set quantidade = v_res, atualizado_em = now() where produto_id = p_produto and unidade_id = p_unidade;
  perform set_config('estoque.via_funcao', '0', true);

  insert into public.movimentacoes (tipo, produto_id, unidade_id, quantidade, saldo_anterior, saldo_resultante, data_movimento, data_estimada,
    motivo, destino, referencia, observacoes, justificativa, transferencia_id, usuario_id, importado, linha_origem)
  values (p_tipo, p_produto, p_unidade, case when p_tipo='AJUSTE' then abs(v_res - v_ant) else p_quantidade end, v_ant, v_res, p_data, p_data_estimada,
    p_motivo, p_destino, p_referencia, p_observacoes, p_justificativa, p_transferencia, v_uid, p_importado, p_linha_origem)
  returning * into v_mov;
  return v_mov;
end $$;
