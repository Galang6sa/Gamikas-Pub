-- KasKelas, M2: login "pilih nama lalu PIN" dengan kode kelas
-- Daftar nama tidak dibuka bebas ke publik. Perangkat baru memasukkan KODE KELAS sekali,
-- lalu daftar nama muncul dan siswa memilih nama + PIN. Perangkat mengingat pilihan (di sisi aplikasi).
-- Kode kelas hanya membuka daftar nama. Tanpa PIN yang benar, tidak ada yang bisa masuk.

create extension if not exists pgcrypto with schema extensions;

-- Tabel rahasia: RLS aktif tanpa kebijakan apa pun, jadi tidak bisa dibaca lewat API. Hanya fungsi di bawah yang menyentuhnya.
create table public.rahasia (
  id               int primary key default 1 check (id = 1),
  kode_kelas_hash  text
);
insert into public.rahasia default values;
alter table public.rahasia enable row level security;
revoke all on public.rahasia from anon, authenticated;

create or replace function public.daftar_login(p_kode text)
returns table (nrp text, nama text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select kode_kelas_hash into v_hash from public.rahasia;
  if v_hash is null
     or encode(digest(lower(trim(coalesce(p_kode, ''))), 'sha256'), 'hex') <> v_hash then
    perform pg_sleep(1);                       -- rem sederhana terhadap tebakan beruntun
    raise exception 'Kode kelas salah' using errcode = '28000';
  end if;
  return query select s.nrp, s.nama from public.siswa s where s.aktif order by s.nrp;
end;
$$;
revoke all on function public.daftar_login(text) from public;
grant execute on function public.daftar_login(text) to anon, authenticated;

-- ATUR KODE KELAS (jalankan sekali di SQL Editor; ganti isinya, minimal 10 karakter, jangan mudah ditebak):
--   update public.rahasia set kode_kelas_hash = encode(extensions.digest(lower(trim('GANTI-KODE-INI')), 'sha256'), 'hex');
-- Bagikan kodenya lewat grup kelas. Kode bisa diganti kapan saja dengan perintah yang sama.
