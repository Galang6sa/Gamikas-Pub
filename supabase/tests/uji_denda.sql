-- Uji logika denda sesuai PRD (denda hidup, tanpa batas atas, pembulatan Rp50)
do $$
declare
  r int;
  procedure_dummy int;
begin
  -- 1. 5-11 Okt dibayar Rabu 21 Okt 10.00 -> k=2 -> 30% = 1500
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-10-21 10:00+07',true,null,20,10,null,50);
  assert r = 1500, format('kasus 1: %s', r);
  -- 2. 12-18 Okt -> k=1 -> 1000
  r := public.hitung_denda(5000,'2026-10-18 23:59:59+07','2026-10-21 10:00+07',true,null,20,10,null,50);
  assert r = 1000, format('kasus 2: %s', r);
  -- 3. 19-25 Okt belum jatuh tempo -> 0
  r := public.hitung_denda(5000,'2026-10-25 23:59:59+07','2026-10-21 10:00+07',true,null,20,10,null,50);
  assert r = 0, format('kasus 3: %s', r);
  -- 4. tepat di jatuh tempo -> 0
  r := public.hitung_denda(5000,'2026-10-25 23:59:59+07','2026-10-25 23:59:59+07',true,null,20,10,null,50);
  assert r = 0, format('kasus 4: %s', r);
  -- 5. Senin 00.00.00 setelahnya -> 1000
  r := public.hitung_denda(5000,'2026-10-25 23:59:59+07','2026-10-26 00:00:00+07',true,null,20,10,null,50);
  assert r = 1000, format('kasus 5: %s', r);
  -- 6. k=3 -> 40% = 2000
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-11-01 10:00+07',true,null,20,10,null,50);
  assert r = 2000, format('kasus 6: %s', r);
  -- 7. saklar dinyalakan 20 Okt 12.00, bayar 21 Okt 10.00 -> k=1 sejak saklar -> 1000
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-10-21 10:00+07',true,'2026-10-20 12:00+07',20,10,null,50);
  assert r = 1000, format('kasus 7: %s', r);
  -- 8. saklar mati -> 0
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-10-21 10:00+07',false,null,20,10,null,50);
  assert r = 0, format('kasus 8: %s', r);
  -- 9. bayar sebelum saklar dinyalakan -> 0 (tidak berlaku surut)
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-10-19 10:00+07',true,'2026-10-20 12:00+07',20,10,null,50);
  assert r = 0, format('kasus 9: %s', r);
  -- 10. batas atas 30% pada k=3 -> 1500
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-11-01 10:00+07',true,null,20,10,30,50);
  assert r = 1500, format('kasus 10: %s', r);
  -- 11. tanpa batas, k=9 -> 100% = 5000
  r := public.hitung_denda(5000,'2026-10-11 23:59:59+07','2026-12-12 10:00+07',true,null,20,10,null,50);
  assert r = 5000, format('kasus 11 (k=9): %s', r);
  raise notice 'Semua kasus hitung_denda lulus';
end $$;

-- Uji alur nyata: tiga tagihan, total Rp17.500 (denda hidup) dan Rp15.000 (denda mati)
do $$
declare
  v_siswa uuid; t record; v_total int := 0; v_waktu timestamptz := '2026-10-21 10:00+07';
  v_n int;
begin
  insert into public.siswa (nrp, nama, no_absen) values ('107', 'Siswa Uji', 7) returning id into v_siswa;
  perform public.buat_tagihan_minggu('2026-10-05');
  perform public.buat_tagihan_minggu('2026-10-12');
  perform public.buat_tagihan_minggu('2026-10-19');
  select count(*) into v_n from public.tagihan; assert v_n = 3, 'jumlah tagihan';

  select jatuh_tempo into strict v_waktu from public.minggu where mulai = '2026-10-05';
  assert v_waktu = '2026-10-11 23:59:59+07', format('jatuh tempo salah: %s', v_waktu);

  v_waktu := '2026-10-21 10:00+07';
  for t in select id from public.tagihan loop
    v_total := v_total + (select pokok + denda from public.hitung_tagihan(t.id, v_waktu));
  end loop;
  assert v_total = 17500, format('total denda hidup: %s', v_total);

  update public.konfigurasi set denda_aktif = false;
  v_total := 0;
  for t in select id from public.tagihan loop
    v_total := v_total + (select pokok + denda from public.hitung_tagihan(t.id, v_waktu));
  end loop;
  assert v_total = 15000, format('total denda mati: %s', v_total);

  -- hidupkan lagi: waktu berlaku mulai terisi otomatis
  update public.konfigurasi set denda_aktif = true;
  assert (select denda_berlaku_mulai from public.konfigurasi) is not null, 'berlaku_mulai tidak terisi';

  -- pembebasan denda butuh alasan
  begin
    update public.tagihan set denda_dibebaskan = true where id = (select id from public.tagihan limit 1);
    raise exception 'seharusnya gagal tanpa alasan';
  exception when check_violation then null;
  end;

  -- Senin yang salah ditolak
  begin
    perform public.buat_tagihan_minggu('2026-10-06');
    raise exception 'seharusnya gagal';
  exception when others then
    if sqlerrm not like 'Tanggal % bukan hari Senin' then raise; end if;
  end;

  -- idempoten: panggil ulang tidak menggandakan
  perform public.buat_tagihan_minggu('2026-10-19');
  select count(*) into v_n from public.tagihan; assert v_n = 3, 'tagihan tergandakan';

  -- log aktivitas mencatat perubahan konfigurasi
  assert (select count(*) from public.log_aktivitas where aksi = 'ubah_konfigurasi') = 2, 'log konfigurasi';
  raise notice 'Uji alur tagihan dan konfigurasi lulus';
end $$;
