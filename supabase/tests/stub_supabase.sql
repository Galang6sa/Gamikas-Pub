-- Hanya untuk uji lokal: meniru bagian Supabase yang dipakai skema (termasuk identitas JWT).
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role anon;          exception when duplicate_object then null; end $$;
grant usage on schema auth to authenticated, anon;
-- Supabase memberi hak bawaan pada setiap tabel/view baru di schema public; tiru agar uji realistis.
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to anon, authenticated;
