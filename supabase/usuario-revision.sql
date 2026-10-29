-- Usuario de demostración para los revisores de App Store y Google Play.
--
-- Las dos tiendas rechazan una app que pide iniciar sesión si no les das con qué
-- entrar. Esta cuenta va escrita en la ficha de cada tienda, en el campo de
-- credenciales de prueba.
--
-- Es un usuario normal (rol 'user'), sin acceso al panel de administración: el
-- revisor ve la app como la ve cualquier persona del equipo.
--
-- Aplicar con:  bash /root/crear-usuario-revision.sh

do $$
declare
  v_id    uuid := gen_random_uuid();
  v_email text := 'store-review@techadvancement.com';
  v_pw    text := 'StoreReview2026!';
begin
  -- Si ya existe de un intento anterior, solo se le repone la contraseña.
  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      extensions.crypt(v_pw, extensions.gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Store Review', 'country', 'US'),
      now(), now()
    );

    -- Sin esta fila GoTrue no sabe con qué identificarlo y el login falla.
    insert into auth.identities (
      id, user_id, provider, provider_id, identity_data,
      created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), v_id, 'email', v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email,
                         'email_verified', true, 'phone_verified', false),
      now(), now(), null
    );
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_pw, extensions.gen_salt('bf', 10)),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
  end if;

  update public.profiles
     set full_name = 'Store Review', country = 'US',
         role = 'user', updated_at = now()
   where id = v_id;

  raise notice 'usuario de revision listo: %', v_email;
end $$;

select email, email_confirmed_at is not null as confirmado
  from auth.users where email = 'store-review@techadvancement.com';
