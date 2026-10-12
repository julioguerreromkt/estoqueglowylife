-- Gestão de usuários pelo administrador sem expor chave de serviço no servidor web.
-- Aplicada em 12/10/2026.
create or replace function public.admin_criar_usuario(p_email text, p_senha text, p_nome text, p_papel text, p_unidades uuid[] default null)
returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(p_email));
begin
  if not public.eh_admin() then raise exception 'Só o administrador cria usuários'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if length(p_senha) < 8 then raise exception 'Senha precisa ter ao menos 8 caracteres'; end if;
  if p_papel not in ('admin','gestor','operador','consulta') then raise exception 'Perfil inválido'; end if;
  if exists (select 1 from auth.users where email = v_email) then raise exception 'Já existe usuário com este e-mail'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, is_super_admin)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'papel', p_papel, 'unidades_permitidas', to_jsonb(p_unidades), 'ativo', true),
    now(), now(), '', '', '', '', false);
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_email, 'email', jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());
  return v_id;
end $$;

create or replace function public.admin_redefinir_senha(p_usuario uuid, p_senha text)
returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador redefine senhas'; end if;
  if length(p_senha) < 8 then raise exception 'Senha precisa ter ao menos 8 caracteres'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')), updated_at = now() where id = p_usuario;
  if not found then raise exception 'Usuário não encontrado'; end if;
end $$;

revoke all on function public.admin_criar_usuario(text,text,text,text,uuid[]) from public, anon;
revoke all on function public.admin_redefinir_senha(uuid,text) from public, anon;
grant execute on function public.admin_criar_usuario(text,text,text,text,uuid[]) to authenticated;
grant execute on function public.admin_redefinir_senha(uuid,text) to authenticated;
