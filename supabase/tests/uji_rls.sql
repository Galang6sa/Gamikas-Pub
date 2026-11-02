-- Uji RLS: siapa boleh melihat apa. Dijalankan setelah 001, 003, 004 dan grant bawaan Supabase.
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;

do $$
declare
  ua uuid := '00000000-0000-0000-0000-00000000000a';  -- siswa 061
  ub uuid := '00000000-0000-0000-0000-00000000000b';  -- siswa 062
  uk uuid := '00000000-0000-0000-0000-00000000000c';  -- bendahara
  uo uuid := '00000000-0000-0000-0000-00000000000d';  -- orang luar, tanpa profil
  sa uuid; sb uuid; pa uuid; pb uuid; n int; rc int;
begin
  select id into sa from public.siswa where nrp='061';
  select id into sb from public.siswa where nrp='062';
  insert into auth.users(id) values (ua),(ub),(uk),(uo);
  insert into public.profil(id, role, siswa_id) values (ua,'siswa',sa),(ub,'siswa',sb);
  insert into public.profil(id, role) values (uk,'bendahara');
  perform public.buat_tagihan_rentang('2026-10-19','2026-10-19');
  insert into public.pembayaran(siswa_id,metode,nominal_bukti,status,ref_id,hash_bukti)
    values (sa,'qris',5000,'terkonfirmasi','REF-A','HASH-A') returning id into pa;
  insert into public.pembayaran(siswa_id,metode,nominal_bukti,status,ref_id,hash_bukti)
    values (sb,'qris',5000,'terkonfirmasi','REF-B','HASH-B') returning id into pb;
  insert into public.alokasi_pembayaran(pembayaran_id,tagihan_id,jumlah_pokok)
    select pa, t.id, 5000 from public.tagihan t where t.siswa_id=sa;
  insert into public.alokasi_pembayaran(pembayaran_id,tagihan_id,jumlah_pokok)
    select pb, t.id, 5000 from public.tagihan t where t.siswa_id=sb;
  insert into public.pengeluaran(tanggal,nominal,kategori) values ('2026-10-20',3000,'alat tulis');
  insert into public.gopay_txn(no_transaksi,waktu_dibuat,nominal) values ('TX1','2026-10-19 13:00+07',5000);

  -- ===== siswa A =====
  perform set_config('request.jwt.claim.sub', ua::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.pembayaran;          assert n = 1,  format('A pembayaran: %s', n);
  select count(*) into n from public.siswa;               assert n = 1,  format('A siswa (hanya diri sendiri): %s', n);
  select count(*) into n from public.siswa_publik;        assert n = 29, format('A siswa_publik: %s', n);
  select count(*) into n from public.papan;               assert n = 29, format('A papan: %s', n);
  select count(*) into n from public.tagihan;             assert n = 29, format('A tagihan: %s', n);
  select count(*) into n from public.pembayaran_publik;   assert n = 2,  format('A pembayaran_publik: %s', n);
  select count(*) into n from public.alokasi_pembayaran;  assert n = 1,  format('A alokasi: %s', n);
  select count(*) into n from public.gopay_txn;           assert n = 0,  format('A gopay: %s', n);
  select count(*) into n from public.log_aktivitas;       assert n = 0,  format('A log: %s', n);
  select count(*) into n from public.pengeluaran;         assert n = 1,  format('A pengeluaran: %s', n);
  select saldo into n from public.saldo_kas;              assert n = 7000, format('A saldo: %s', n);
  begin insert into public.pengeluaran(tanggal,nominal,kategori) values (now(),1,'x'); assert false, 'A bisa insert pengeluaran';
  exception when insufficient_privilege then null; end;
  begin insert into public.pembayaran(siswa_id,metode,nominal_bukti,status) values (sa,'qris',1,'terkonfirmasi'); assert false, 'A bisa insert pembayaran';
  exception when insufficient_privilege then null; end;
  update public.konfigurasi set nominal_mingguan = 1; get diagnostics rc = row_count; assert rc = 0, 'A bisa ubah konfigurasi';
  update public.pembayaran set status='ditolak' where id = pb; get diagnostics rc = row_count; assert rc = 0, 'A bisa ubah pembayaran B';
  begin perform public.buat_tagihan_minggu('2026-10-26'); assert false, 'A bisa panggil buat_tagihan_minggu';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- ===== bendahara =====
  perform set_config('request.jwt.claim.sub', uk::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.pembayaran;   assert n = 2, format('K pembayaran: %s', n);
  select count(*) into n from public.siswa;        assert n = 29, format('K siswa: %s', n);
  select count(*) into n from public.gopay_txn;    assert n = 1, format('K gopay: %s', n);
  insert into public.pengeluaran(tanggal,nominal,kategori) values ('2026-10-21',2000,'fotokopi');
  update public.konfigurasi set denda_aktif = false; get diagnostics rc = row_count; assert rc = 1, 'K gagal ubah konfigurasi';
  select count(*) into n from public.log_aktivitas; assert n >= 1, 'K log kosong';
  execute 'reset role';

  -- ===== orang luar: akun terdaftar tetapi tanpa profil =====
  perform set_config('request.jwt.claim.sub', uo::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.siswa_publik;   assert n = 0, format('O siswa_publik: %s', n);
  select count(*) into n from public.papan;          assert n = 0, format('O papan: %s', n);
  select count(*) into n from public.pembayaran_publik; assert n = 0, format('O pembayaran_publik: %s', n);
  select count(*) into n from public.saldo_kas;      assert n = 0, format('O saldo_kas: %s', n);
  select count(*) into n from public.tagihan;        assert n = 0, format('O tagihan: %s', n);
  select count(*) into n from public.minggu;         assert n = 0, format('O minggu: %s', n);
  select count(*) into n from public.pengeluaran;    assert n = 0, format('O pengeluaran: %s', n);
  select count(*) into n from public.konfigurasi;    assert n = 0, format('O konfigurasi: %s', n);
  select count(*) into n from public.pembayaran;     assert n = 0, format('O pembayaran: %s', n);
  execute 'reset role';

  -- ===== anon (tanpa login) =====
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin perform 1 from public.papan; assert false, 'anon bisa baca papan';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.siswa; assert false, 'anon bisa baca siswa';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise notice 'Uji RLS lulus (siswa, bendahara, orang luar, anon)';
end $$;
