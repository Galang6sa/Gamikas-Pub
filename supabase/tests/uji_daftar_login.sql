do $$
declare n int; kode text := 'meja-biru-sembilan-47';
begin
  -- belum ada kode: semua tebakan ditolak
  begin perform public.daftar_login('apa saja'); assert false, 'harus ditolak saat kode belum diatur';
  exception when invalid_authorization_specification then null; end;

  update public.rahasia set kode_kelas_hash = encode(extensions.digest(lower(trim(kode)), 'sha256'), 'hex');

  execute 'set local role anon';
  begin perform public.daftar_login('salah'); assert false, 'kode salah harus ditolak';
  exception when invalid_authorization_specification then null; end;
  begin perform public.daftar_login(null); assert false, 'kode null harus ditolak';
  exception when invalid_authorization_specification then null; end;
  select count(*) into n from public.daftar_login('  Meja-Biru-Sembilan-47 '); assert n = 29, format('kode benar: %s', n);
  -- anon tetap tidak boleh membaca tabel secara langsung, termasuk tabel rahasia
  begin perform 1 from public.siswa; assert false, 'anon bisa baca siswa';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.rahasia; assert false, 'anon bisa baca rahasia';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- siswa yang sudah login juga tidak bisa membaca tabel rahasia
  insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000e1');
  insert into public.profil(id, role, siswa_id) select '00000000-0000-0000-0000-0000000000e1','siswa', id from public.siswa where nrp='061';
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1', true);
  execute 'set local role authenticated';
  begin perform 1 from public.rahasia; assert false, 'authenticated bisa baca rahasia';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  raise notice 'Uji daftar_login lulus';
end $$;
