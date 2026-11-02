do $$
declare
  ua uuid := '00000000-0000-0000-0000-0000000000a1'; ub uuid := '00000000-0000-0000-0000-0000000000b1'; uk uuid := '00000000-0000-0000-0000-0000000000c1';
  sa uuid; sb uuid; n int; r record; v_pay uuid; ids uuid[]; v_tagB uuid; v_tag63 uuid; v_tag64 uuid; v_min19 uuid; v_before int; v_after int;
  v_due timestamptz; v_exp int; v_mulai timestamptz;
begin
  select id into sa from public.siswa where nrp='061'; select id into sb from public.siswa where nrp='062';
  insert into auth.users(id) values (ua),(ub),(uk);
  insert into public.profil(id,role,siswa_id) values (ua,'siswa',sa),(ub,'siswa',sb);
  insert into public.profil(id,role) values (uk,'bendahara');
  perform public.buat_tagihan_rentang('2026-09-07','2026-10-19');
  update public.konfigurasi set denda_berlaku_mulai = '2026-10-26 00:00+07';
  select t.id into v_tagB  from public.tagihan t join public.minggu m on m.id=t.minggu_id where t.siswa_id=sb and m.mulai='2026-09-07';
  select t.id into v_tag63 from public.tagihan t join public.minggu m on m.id=t.minggu_id join public.siswa s on s.id=t.siswa_id where s.nrp='063' and m.mulai='2026-09-07';
  select t.id into v_tag64 from public.tagihan t join public.minggu m on m.id=t.minggu_id join public.siswa s on s.id=t.siswa_id where s.nrp='064' and m.mulai='2026-09-07';
  select id into v_min19 from public.minggu where mulai='2026-10-19';

  -- ===== siswa A =====
  perform set_config('request.jwt.claim.sub', ua::text, true); execute 'set local role authenticated';
  select count(*) into n from public.ringkasan_saya('2026-10-23 10:00+07'); assert n = 7, format('ringkasan: %s', n);
  select sum(total) into n from public.ringkasan_saya('2026-10-23 10:00+07'); assert n = 35000, format('sebelum go-live: %s', n);
  select sum(total) into n from public.ringkasan_saya('2026-10-27 10:00+07'); assert n = 42000, format('sesudah go-live: %s', n);
  select array_agg(tagihan_id order by mulai) into ids from public.ringkasan_saya();
  select * into r from public.hitung_total_saya(ids[1:2], '2026-10-27 10:00+07');
  assert r.jumlah = 2 and r.pokok = 10000 and r.denda = 2000 and r.total = 12000, format('total saya: %s %s %s', r.jumlah, r.denda, r.total);
  begin perform * from public.hitung_total_saya(array[v_tagB]); assert false, 'A bisa menghitung tagihan milik B';
  exception when others then if sqlerrm not like 'Tagihan tidak valid%' then raise; end if; end;
  begin perform public.catat_pembayaran_manual('061','cash', now() - interval '1 hour', 1); assert false, 'siswa bisa catat pembayaran';
  exception when insufficient_privilege then null; end;
  begin perform public.bebaskan_denda(ids[1], 'iseng'); assert false, 'siswa bisa bebaskan denda';
  exception when insufficient_privilege then null; end;
  begin perform public.atur_minggu_libur(v_min19, true); assert false, 'siswa bisa atur libur';
  exception when insufficient_privilege then null; end;
  begin perform public.batalkan_pembayaran(gen_random_uuid(), 'iseng'); assert false, 'siswa bisa batalkan';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- ===== anon =====
  perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon';
  begin perform * from public.ringkasan_saya(); assert false, 'anon bisa panggil ringkasan_saya';
  exception when insufficient_privilege then null; end;
  begin perform public.catat_pembayaran_manual('061','cash', now(), 1); assert false, 'anon bisa catat';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- ===== bendahara =====
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  select saldo into v_before from public.saldo_kas;
  v_pay := public.catat_pembayaran_manual('061','cash','2026-10-10 10:00+07', 2);
  assert (select nominal_bukti from public.pembayaran where id = v_pay) = 10000, 'riwayat sebelum go-live tanpa denda';
  assert (select count(*) from public.alokasi_pembayaran where pembayaran_id = v_pay) = 2, 'dua alokasi';
  assert (select min(m.mulai) || '' from public.alokasi_pembayaran a join public.tagihan t on t.id=a.tagihan_id join public.minggu m on m.id=t.minggu_id where a.pembayaran_id = v_pay) = '2026-09-07', 'terlama dulu';
  select saldo into v_after from public.saldo_kas; assert v_after - v_before = 10000, format('saldo naik: %s', v_after - v_before);
  -- NRP tanpa nol di depan
  perform public.catat_pembayaran_manual('62','cash','2026-10-10 10:00+07', 1);
  begin perform public.catat_pembayaran_manual('062','cash','2026-10-10 10:00+07', 9); assert false, 'harus galat tagihan kurang';
  exception when others then if sqlerrm not like 'Siswa hanya punya%' then raise; end if; end;
  begin perform public.catat_pembayaran_manual('062','cash', now() + interval '1 day', 1); assert false, 'harus galat masa depan';
  exception when others then if sqlerrm not like '%masa depan%' then raise; end if; end;
  begin perform public.catat_pembayaran_manual('999','cash', now() - interval '1 hour', 1); assert false, 'harus galat NRP';
  exception when others then if sqlerrm not like 'NRP % tidak ditemukan' then raise; end if; end;
  begin perform public.catat_pembayaran_manual('063','cash', now() - interval '1 hour', null, array[v_tagB]); assert false, 'tagihan milik orang lain';
  exception when others then if sqlerrm not like 'Ada tagihan yang bukan milik%' then raise; end if; end;

  -- denda ikut dihitung bila berlaku: pakai tanggal berlaku 30 hari lalu, bayar 1 jam lalu
  execute 'reset role'; update public.konfigurasi set denda_berlaku_mulai = now() - interval '30 days';
  select denda_berlaku_mulai into v_mulai from public.konfigurasi; select jatuh_tempo into v_due from public.minggu where mulai='2026-09-07';
  perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  v_exp := 5000 + public.hitung_denda(5000, v_due, now() - interval '1 hour', true, v_mulai, 20, 10, null, 50);
  assert v_exp > 5000, 'uji butuh denda > 0';
  v_pay := public.catat_pembayaran_manual('063','cash', now() - interval '1 hour', null, array[v_tag63]);
  assert (select nominal_bukti from public.pembayaran where id = v_pay) = v_exp, 'nominal harus sama dengan hitung_denda';
  assert (select jumlah_denda from public.alokasi_pembayaran where pembayaran_id = v_pay) = v_exp - 5000, 'denda terkunci di alokasi';

  -- bebaskan denda
  assert (select denda from public.hitung_tagihan(v_tag64, now())) > 0, 'sebelum dibebaskan ada denda';
  begin perform public.bebaskan_denda(v_tag64, '  '); assert false, 'alasan wajib';
  exception when others then if sqlerrm not like 'Alasan wajib%' then raise; end if; end;
  perform public.bebaskan_denda(v_tag64, 'izin sakit');
  assert (select denda from public.hitung_tagihan(v_tag64, now())) = 0, 'setelah dibebaskan denda 0';
  begin perform public.bebaskan_denda(v_tag63, 'sudah lunas'); assert false, 'tagihan lunas tidak bisa dibebaskan';
  exception when others then if sqlerrm not like 'Tagihan sudah lunas%' then raise; end if; end;

  -- libur: minggu berpembayaran ditolak, minggu kosong diterima
  begin perform public.atur_minggu_libur((select id from public.minggu where mulai='2026-09-07'), true); assert false, 'libur minggu berpembayaran';
  exception when others then if sqlerrm not like 'Minggu ini sudah ada pembayaran%' then raise; end if; end;
  perform public.atur_minggu_libur(v_min19, true);
  execute 'reset role'; perform set_config('request.jwt.claim.sub', ua::text, true); execute 'set local role authenticated';
  select * into r from public.ringkasan_saya() where mulai='2026-10-19'; assert r.status='libur' and r.total=0, format('libur: %s %s', r.status, r.total);
  execute 'reset role'; perform set_config('request.jwt.claim.sub', uk::text, true); execute 'set local role authenticated';
  perform public.atur_minggu_libur(v_min19, false);

  -- batalkan pembayaran
  select saldo into v_before from public.saldo_kas;
  perform public.batalkan_pembayaran((select id from public.pembayaran where siswa_id=sa and status='terkonfirmasi' limit 1), 'salah catat');
  select saldo into v_after from public.saldo_kas; assert v_before - v_after = 10000, format('saldo turun: %s', v_before - v_after);
  begin perform public.batalkan_pembayaran((select id from public.pembayaran where status='dibatalkan' limit 1), 'lagi'); assert false, 'batal dua kali';
  exception when others then if sqlerrm not like 'Pembayaran tidak ditemukan%' then raise; end if; end;
  select count(*) into n from public.log_aktivitas where aksi in ('catat_pembayaran_manual','bebaskan_denda','atur_minggu_libur','batalkan_pembayaran');
  assert n = 7, format('log aktivitas: %s', n);  -- 3 catat + 1 bebaskan + 2 libur + 1 batal
  execute 'reset role';
  raise notice 'Uji RPC aplikasi lulus';
end $$;
