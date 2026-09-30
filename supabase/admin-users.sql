-- Crear y editar usuarios desde el panel de administración.
--
-- Mismo patrón que admin_delete_user, que ya existía: SECURITY DEFINER con la
-- guardia public.is_admin(), para que el cliente nunca necesite la service_role
-- key (que iría incrustada en el bundle y se la llevaría cualquiera).
--
-- Aplicar con:  psql -U postgres -d postgres -f supabase/admin-users.sql
-- o pegándolo en el Query Tool de pgAdmin sobre la base `postgres`.

-- ---------------------------------------------------------------- crear

create or replace function public.admin_create_user(
  p_email     text,
  p_password  text,
  p_full_name text default '',
  p_country   text default '',
  p_role      text default 'user'
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id    uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'password must be at least 8 characters';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'invalid role';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'email already registered';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),                                   -- creado por un admin: ya confirmado
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', coalesce(trim(p_full_name), ''),
      'country',   coalesce(trim(p_country), '')
    ),
    now(), now()
  );

  -- Sin esta fila GoTrue no encuentra con qué identificarlo y el login falla
  -- con "Invalid login credentials", aunque la contraseña sea correcta.
  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data,
    created_at, updated_at, last_sign_in_at
  ) values (
    gen_random_uuid(), v_id, 'email', v_id::text,
    jsonb_build_object(
      'sub', v_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    now(), now(), null
  );

  -- El trigger on_auth_user_created ya insertó el perfil; aquí se completa el
  -- rol, que el trigger no conoce.
  update public.profiles
     set full_name  = coalesce(nullif(trim(p_full_name), ''), full_name),
         country    = coalesce(nullif(trim(p_country), ''), country),
         role       = p_role,
         updated_at = now()
   where id = v_id;

  return v_id;
end $$;

-- ---------------------------------------------------------------- editar

-- Los parámetros en null se dejan como están: así la pantalla puede mandar
-- solo lo que cambió y, en particular, no tocar la contraseña si se deja vacía.
create or replace function public.admin_update_user(
  p_user_id   uuid,
  p_email     text default null,
  p_password  text default null,
  p_full_name text default null,
  p_country   text default null,
  p_role      text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found';
  end if;

  -- Quitarse a uno mismo el rol de admin deja el panel sin dueño si es el
  -- único; se bloquea igual que borrarse a uno mismo.
  if p_role is not null and p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot remove your own admin role';
  end if;
  if p_role is not null and p_role not in ('user', 'admin') then
    raise exception 'invalid role';
  end if;

  if p_email is not null and v_email <> '' then
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'invalid email';
    end if;
    if exists (select 1 from auth.users where lower(email) = v_email and id <> p_user_id) then
      raise exception 'email already registered';
    end if;
    update auth.users
       set email = v_email, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
     where id = p_user_id;
    update auth.identities
       set identity_data = identity_data || jsonb_build_object('email', v_email),
           updated_at = now()
     where user_id = p_user_id and provider = 'email';
  end if;

  if p_password is not null and p_password <> '' then
    if length(p_password) < 8 then
      raise exception 'password must be at least 8 characters';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
           updated_at = now()
     where id = p_user_id;
  end if;

  update public.profiles
     set full_name  = coalesce(nullif(trim(p_full_name), ''), full_name),
         country    = coalesce(nullif(trim(p_country), ''), country),
         role       = coalesce(p_role, role),
         updated_at = now()
   where id = p_user_id;
end $$;

-- ---------------------------------------------------------------- permisos

-- Solo sesiones autenticadas pueden siquiera intentarlo; dentro, is_admin()
-- vuelve a comprobar. anon no las ve.
revoke all on function public.admin_create_user(text, text, text, text, text) from public, anon;
revoke all on function public.admin_update_user(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_update_user(uuid, text, text, text, text, text) to authenticated, service_role;
