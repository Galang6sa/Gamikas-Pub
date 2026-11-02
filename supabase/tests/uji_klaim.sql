create or replace function public.uji_iso(t timestamptz) returns text language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;
do $$
declare
  ua uuid := '00000000-0000-0000-0000-0000000000a2'; ub uuid := '00000000-0000-0000-0000-0000000000b2';
  uc uuid := '00000000-0000-0000-0000-0000000000c2'; ud uuid := '00000000-0000-0000-0000-0000000000d2'; uk uuid := '00000000-0000-0000-0000-0000000000e2';
  sa uuid; sb uuid; sc uuid; sd uuid; ids_a uuid[]; ids_b uuid[]; ids_c uuid[]; ids_d uuid[]; r record; n int; pay_a uuid; pay_b uuid; pay_c uuid; pay_d uuid; pay_z uuid;
  ocr_ok jsonb := '{"sukses": true, "merchantCocok": true}'; ocr_no jsonb := '{"sukses": true, "merchantCocok": false}';
  wkt timestamptz;
begin
  select id into sa from public.siswa where nrp='061'; select id into sb from public.siswa where nrp='062';
  select id into sc from public.siswa where nrp='063'; select id into sd from public.siswa where nrp='064';
  insert into auth.users(id) values (ua),(ub),(uc),(ud),(uk);
  insert into public.profil(id,role,siswa_id) values (ua,'siswa',sa),(ub,'siswa',sb),(uc,'siswa',sc),(ud,'siswa',sd);
  insert into public.profil(id,role) values (uk,'bendahara');
  perform public.buat_tagihan_rentang('2026-09-07','2026-10-19');
  update public.konfigurasi set denda_berlaku_mulai = '2026-10-26 00:00+07';
  select array_agg(t.id order by m.mulai) into ids_a from public.tagihan t join public.minggu m on m.id=t.minggu_id where t.siswa_id=sa;
  select array_agg(t.id order by m.mulai) into ids_b from public.tagihan t join public.minggu m on m.id=t.minggu_id where t.siswa_id=sb;
  select array_agg(t.id order by m.mulai) into ids_c from public.tagihan t join public.minggu m on m.id=t.minggu_id where t.siswa_id=sc;
  select array_agg(t.id order by m.mulai) into ids_d from public.tagihan t join public.minggu m on m.id=t.minggu_id where t.siswa_id=sd;

  -- ===== siswa A =====
  perform set_config('request.jwt.claim.sub', ua::text, true); execute 'set local role authenticated';
  wkt := now() - interval '2 days';
  -- T1 lolos validasi, laporan belum ada -> lunas_sementara
  select * into r from public.ajukan_pembayaran_qris(ids_a[1:1], 5000, wkt, 'REF-A1', 'HASH-A1', ocr_ok);
  assert r.status = 'lunas_sementara' and r.total = 5000, format('T1: %s %s', r.status, r.total);
  pay_a := r.pembayaran_id;
  select status into strict r.status from public.ringkasan_saya() where tagihan_id = ids_a[1];
  assert r.status = 'lunas_sementara', 'ringkasan menampilkan lunas_sementara';
  -- T2 duplikat ref, duplikat hash, tagihan sudah terpakai
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], 5000, wkt, 'REF-A1', 'HASH-X', ocr_ok); assert false, 'ref kembar';
  exception when others then if sqlerrm not like 'Bukti ini sudah pernah dipakai%' then raise; end if; end;
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], 5000, wkt, 'REF-X', 'HASH-A1', ocr_ok); assert false, 'hash kembar';
  exception when others then if sqlerrm not like 'Bukti ini sudah pernah dipakai%' then raise; end if; end;
  begin perform * from public.ajukan_pembayaran_qris(ids_a[1:1], 5000, wkt, 'REF-Y', 'HASH-Y', ocr_ok); assert false, 'tagihan terpakai';
  exception when others then if sqlerrm not like 'Tagihan tidak valid%' then raise; end if; end;
  -- T3 nominal beda, waktu masa depan, bukti terlalu lama, nominal kosong
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], 10000, wkt, 'R1', 'H1', ocr_ok); assert false, 'nominal beda';
  exception when others then if sqlerrm not like 'Nominal di bukti Rp10.000 tidak sama dengan total pilihanmu Rp5.000%' then raise; end if; end;
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], 5000, now() + interval '1 day', 'R2', 'H2', ocr_ok); assert false, 'masa depan';
  exception when others then if sqlerrm not like '%masa depan%' then raise; end if; end;
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], 5000, now() - interval '60 days', 'R3', 'H3', ocr_ok); assert false, 'terlalu lama';
  exception when others then if sqlerrm not like 'Bukti terlalu lama%' then raise; end if; end;
  begin perform * from public.ajukan_pembayaran_qris(ids_a[2:2], null, wkt, 'R4', 'H4', ocr_ok); assert false, 'nominal kosong';
  exception when others then if sqlerrm not like 'Nominal di bukti tidak terbaca%' then raise; end if; end;
  -- tagihan milik siswa lain ditolak
  begin perform * from public.ajukan_pembayaran_qris(ids_b[1:1], 5000, wkt, 'R5', 'H5', ocr_ok); assert false, 'tagihan orang lain';
  exception when others then if sqlerrm not like 'Tagihan tidak valid%' then raise; end if; end;
  -- bukti tanpa waktu -> perlu_dicek, merchant tidak terbaca -> perlu_dicek
  select * into r from public.ajukan_pembayaran_qris(ids_a[2:2], 5000, null, null, 'HASH-A2', ocr_ok);
  assert r.status = 'perlu_dicek', format('tanpa waktu: %s', r.status);
  select * into r from public.ajukan_pembayaran_qris(ids_a[3:3], 5000, wkt - interval '3 hours', 'REF-A3', 'HASH-A3', ocr_no);
  assert r.status = 'perlu_dicek', format('merchant tidak cocok: %s', r.status);
  execute 'reset role';

  -- ===== siswa tidak boleh memanggil fungsi bendahara =====
  perform set_config('request.jwt.claim.sub', ua::text, true); execute 'set local role authenticated';
  begin perform * from public.impor_gopay('[]'::jsonb); assert false, 'siswa impor';
  exception when insufficient_privilege then null; end;
  begin perform public.tetapkan_pemilik('X', '061'); assert false, 'siswa tetapkan';
  exception when insufficient_privilege then null; end;
  begin perform public.putuskan_klaim(pay_a, true); assert false, 'siswa putuskan';
  exception when insufficient_privilege then null; end;
  execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  begin perform * from public.ajukan_pembayaran_qris(ids_a[4:4], 5000, now(), 'R', 'H', ocr_ok); assert false, 'anon ajukan';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- ===== bendahara: impor laporan GoPay =====
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  -- baris cocok untuk klaim A1 (selisih 3 detik), dua baris kembar untuk klaim B, satu baris lama tanpa pemilik, satu transaksi GAGAL
  select * into r from public.impor_gopay(jsonb_build_array(
    jsonb_build_object('no_transaksi','TX-A1','waktu_dibuat', public.uji_iso(wkt + interval '3 seconds'),'nominal',5000,'ref','a','merchant_id','G975190623','status','SUKSES'),
    jsonb_build_object('no_transaksi','TX-Z','waktu_dibuat', public.uji_iso(now() - interval '20 days'),'nominal',10000,'ref','z','merchant_id','G975190623','status','SUKSES'),
    jsonb_build_object('no_transaksi','TX-GAGAL','waktu_dibuat', public.uji_iso(now() - interval '19 days'),'nominal',5000,'ref','g','merchant_id','G975190623','status','GAGAL')));
  assert r.baru = 2 and r.dicocokkan = 1, format('impor 1: baru=%s cocok=%s', r.baru, r.dicocokkan);
  assert (select status from public.pembayaran where id = pay_a) = 'terkonfirmasi', 'A1 terkonfirmasi';
  assert (select pembayaran_id from public.gopay_txn where no_transaksi = 'TX-A1') = pay_a, 'tautan A1';
  assert not exists (select 1 from public.gopay_txn where no_transaksi = 'TX-GAGAL'), 'transaksi gagal tidak diimpor';
  -- idempoten
  select * into r from public.impor_gopay(jsonb_build_array(jsonb_build_object('no_transaksi','TX-A1','waktu_dibuat', public.uji_iso(wkt),'nominal',5000,'merchant_id','G975190623','status','SUKSES')));
  assert r.baru = 0 and r.dicocokkan = 0, 'impor ulang tidak menggandakan';
  execute 'reset role';

  -- ===== T6: kandidat ganda -> perlu_dicek, lalu bendahara menautkan manual =====
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  perform * from public.impor_gopay(jsonb_build_array(
    jsonb_build_object('no_transaksi','TX-X','waktu_dibuat', public.uji_iso(now() - interval '1 day'),'nominal',5000,'merchant_id','G975190623','status','SUKSES'),
    jsonb_build_object('no_transaksi','TX-Y','waktu_dibuat', public.uji_iso(now() - interval '1 day' + interval '10 seconds'),'nominal',5000,'merchant_id','G975190623','status','SUKSES')));
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', ub::text, true); execute 'set local role authenticated';
  select * into r from public.ajukan_pembayaran_qris(ids_b[1:1], 5000, now() - interval '1 day' + interval '5 seconds', 'REF-B1', 'HASH-B1', ocr_ok);
  assert r.status = 'perlu_dicek', format('kembar harus perlu_dicek: %s', r.status);
  pay_b := r.pembayaran_id;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  perform public.putuskan_klaim(pay_b, true, null, 'TX-X');
  assert (select status from public.pembayaran where id = pay_b) = 'terkonfirmasi', 'B terkonfirmasi manual';
  assert (select pembayaran_id from public.gopay_txn where no_transaksi = 'TX-X') = pay_b, 'tautan TX-X';
  begin perform public.putuskan_klaim(pay_b, true); assert false, 'sudah diputuskan';
  exception when others then if sqlerrm not like 'Klaim ini tidak sedang menunggu%' then raise; end if; end;
  execute 'reset role';

  -- ===== T7: laporan sudah mencakup waktu klaim tetapi tidak ada transaksi -> mencurigakan langsung =====
  perform set_config('request.jwt.claim.sub', uc::text, true); execute 'set local role authenticated';
  select * into r from public.ajukan_pembayaran_qris(ids_c[1:1], 5000, now() - interval '10 days', 'REF-C1', 'HASH-C1', ocr_ok);
  assert r.status = 'mencurigakan', format('C: %s', r.status);
  pay_c := r.pembayaran_id;
  select status into strict r.status from public.ringkasan_saya() where tagihan_id = ids_c[1];
  assert r.status = 'mencurigakan', 'ringkasan menampilkan mencurigakan';
  execute 'reset role';
  -- mencurigakan tidak masuk saldo resmi
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  select pemasukan_kas into n from public.saldo_kas;
  assert n = 10000, format('saldo hanya A1 + B1: %s', n);
  -- tolak klaim: alasan wajib, tagihan kembali belum lunas
  begin perform public.putuskan_klaim(pay_c, false, '  '); assert false, 'alasan wajib';
  exception when others then if sqlerrm not like 'Alasan penolakan wajib%' then raise; end if; end;
  perform public.putuskan_klaim(pay_c, false, 'tidak ada di laporan');
  assert (select status from public.pembayaran where id = pay_c) = 'ditolak', 'C ditolak';
  assert not exists (select 1 from public.alokasi_pembayaran where tagihan_id = ids_c[1]), 'tagihan C kembali belum lunas';
  execute 'reset role';

  -- ===== T8: impor menandai lunas_sementara lama sebagai mencurigakan =====
  perform set_config('request.jwt.claim.sub', ud::text, true); execute 'set local role authenticated';
  -- laporan sudah ada baris 1 hari lalu; klaim D di 1,5 hari lalu... gunakan waktu sebelum laporan terbaru lebih dari 1 hari tidak mungkin tanpa langsung mencurigakan
  -- maka buat klaim D lunas_sementara dengan waktu SESUDAH baris terakhir laporan, lalu impor baris yang lebih baru
  select * into r from public.ajukan_pembayaran_qris(ids_d[1:1], 5000, now() - interval '30 minutes', 'REF-D1', 'HASH-D1', ocr_ok);
  assert r.status = 'lunas_sementara', format('D awal: %s', r.status);
  pay_d := r.pembayaran_id;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  select * into r from public.impor_gopay(jsonb_build_array(
    jsonb_build_object('no_transaksi','TX-LATE','waktu_dibuat', public.uji_iso(now() + interval '2 days'),'nominal',7000,'merchant_id','G975190623','status','SUKSES')));
  assert r.mencurigakan = 1, format('impor menandai mencurigakan: %s', r.mencurigakan);
  assert (select status from public.pembayaran where id = pay_d) = 'mencurigakan', 'D mencurigakan';
  execute 'reset role';

  -- ===== T9: tetapkan pemilik untuk TX-Z (Rp10.000, 20 hari lalu) ke siswa 065 =====
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  pay_z := public.tetapkan_pemilik('TX-Z', '65');
  assert (select count(*) from public.alokasi_pembayaran where pembayaran_id = pay_z) = 2, 'dua minggu';
  assert (select status from public.pembayaran where id = pay_z) = 'terkonfirmasi', 'Z terkonfirmasi';
  begin perform public.tetapkan_pemilik('TX-Z', '065'); assert false, 'sudah punya pemilik';
  exception when others then if sqlerrm not like 'Transaksi ini sudah punya pemilik' then raise; end if; end;
  begin perform public.tetapkan_pemilik('TX-LATE', '066'); assert false, 'nominal tidak cocok';
  exception when others then if sqlerrm not like 'Nominal Rp7.000 tidak cocok%' then raise; end if; end;
  begin perform public.tetapkan_pemilik('TX-LATE', '999'); assert false, 'nrp tidak ada';
  exception when others then if sqlerrm not like 'NRP 999 tidak ditemukan' then raise; end if; end;
  execute 'reset role';

  -- ===== T10: siswa membatalkan klaim sendiri =====
  perform set_config('request.jwt.claim.sub', ud::text, true); execute 'set local role authenticated';
  perform public.batalkan_klaim_saya(pay_d);
  assert (select status from public.pembayaran where id = pay_d) = 'dibatalkan', 'D dibatalkan';
  execute 'reset role'; perform set_config('request.jwt.claim.sub', ub::text, true); execute 'set local role authenticated';
  begin perform public.batalkan_klaim_saya(pay_b); assert false, 'terkonfirmasi tidak bisa dibatalkan siswa';
  exception when others then if sqlerrm not like 'Hanya klaim yang belum terkonfirmasi%' then raise; end if; end;
  begin perform public.batalkan_klaim_saya(pay_d); assert false, 'klaim milik orang lain / sudah batal';
  exception when others then if sqlerrm not like 'Hanya klaim yang belum terkonfirmasi%' then raise; end if; end;
  execute 'reset role';

  -- papan: status lunas_sementara/perlu_dicek/mencurigakan tampil, dibatalkan/ditolak kembali belum
  perform set_config('request.jwt.claim.sub', ua::text, true); execute 'set local role authenticated';
  select count(*) into n from public.papan where status = 'perlu_dicek'; assert n = 2, format('papan perlu_dicek: %s', n);
  select count(*) into n from public.papan where status = 'terkonfirmasi'; assert n = 1 + 1 + 2, format('papan terkonfirmasi (A1,B1,Z x2): %s', n);
  execute 'reset role';
  raise notice 'Uji klaim QRIS dan impor GoPay lulus';
end $$;
