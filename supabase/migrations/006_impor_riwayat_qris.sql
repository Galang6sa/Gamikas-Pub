-- KasKelas, M2: impor riwayat QRIS dari ekspor GoPay Merchant + penetapan pemilik
-- Alur bendahara:
--   1. Buka berkas qris_riwayat_untuk_diisi.csv di Sheets/Excel. Hanya kolom "nrp" yang diisi (kosongkan bila belum tahu pemiliknya).
--   2. Supabase, Table Editor, tabel impor_qris, Insert, Import data from CSV.
--   3. Jalankan:  select * from public.proses_impor_qris();
-- Aturan: nominal harus kelipatan nominal mingguan (riwayat sebelum go-live tidak berdenda).
-- Setiap pembayaran melunasi tagihan TERLAMA yang belum lunas milik siswa itu.
-- Baris tanpa nrp tetap masuk ke gopay_txn sebagai "uang tanpa pemilik".
-- Fungsi bersifat atomik: bila ada satu baris yang salah, tidak ada yang tersimpan dan pesan galat menyebut barisnya.
-- Dapat dijalankan ulang: baris yang sudah punya pemilik dilewati; baris tanpa pemilik bisa diproses setelah nrp-nya diisi.

create table public.impor_qris (
  no_transaksi  text primary key,
  waktu_dibuat  timestamptz not null,
  nominal       int  not null check (nominal > 0),
  ref           text,
  merchant_id   text,
  nrp           text
);
alter table public.impor_qris enable row level security;
revoke all on public.impor_qris from anon, authenticated;

create or replace function public.proses_impor_qris()
returns table (diproses int, tanpa_pemilik int, dilewati int)
language plpgsql security definer set search_path = public as $$
declare
  r record; g record; v_siswa uuid; v_nrp text; v_pay uuid; v_k int; v_tag uuid[]; v_nom int; t uuid;
  n_proses int := 0; n_kosong int := 0; n_lewat int := 0;
begin
  select nominal_mingguan into v_nom from public.konfigurasi;

  for r in select * from public.impor_qris order by waktu_dibuat, no_transaksi loop
    select * into g from public.gopay_txn where no_transaksi = r.no_transaksi;
    if found and g.pembayaran_id is not null then n_lewat := n_lewat + 1; continue; end if;

    v_nrp := nullif(lpad(trim(coalesce(r.nrp, '')), 3, '0'), '000');
    if coalesce(trim(r.nrp), '') = '' then v_nrp := null; end if;

    if v_nrp is null then
      insert into public.gopay_txn (no_transaksi, waktu_dibuat, nominal, ref, merchant_id, status)
      values (r.no_transaksi, r.waktu_dibuat, r.nominal, r.ref, r.merchant_id, 'SUKSES')
      on conflict (no_transaksi) do nothing;
      n_kosong := n_kosong + 1; continue;
    end if;

    select id into v_siswa from public.siswa where nrp = v_nrp;
    if v_siswa is null then raise exception 'Baris % : NRP % tidak ditemukan', r.no_transaksi, v_nrp; end if;
    if r.nominal % v_nom <> 0 then
      raise exception 'Baris % : nominal % bukan kelipatan %', r.no_transaksi, r.nominal, v_nom;
    end if;
    v_k := r.nominal / v_nom;

    select array_agg(x.id) into v_tag from (
      select t.id from public.tagihan t
      join public.minggu m on m.id = t.minggu_id
      where t.siswa_id = v_siswa and m.ditagih
        and not exists (select 1 from public.alokasi_pembayaran a where a.tagihan_id = t.id)
      order by m.mulai limit v_k) x;
    if coalesce(array_length(v_tag, 1), 0) < v_k then
      raise exception 'Baris % : NRP % hanya punya % tagihan belum lunas, butuh %',
        r.no_transaksi, v_nrp, coalesce(array_length(v_tag, 1), 0), v_k;
    end if;

    insert into public.pembayaran (siswa_id, metode, nominal_bukti, waktu_bayar, status, gopay_txn_id)
    values (v_siswa, 'qris', r.nominal, r.waktu_dibuat, 'terkonfirmasi', r.no_transaksi)
    returning id into v_pay;

    foreach t in array v_tag loop
      insert into public.alokasi_pembayaran (pembayaran_id, tagihan_id, jumlah_pokok, jumlah_denda)
      select v_pay, t, tg.nominal_pokok, 0 from public.tagihan tg where tg.id = t;
    end loop;

    insert into public.gopay_txn (no_transaksi, waktu_dibuat, nominal, ref, merchant_id, status, pembayaran_id)
    values (r.no_transaksi, r.waktu_dibuat, r.nominal, r.ref, r.merchant_id, 'SUKSES', v_pay)
    on conflict (no_transaksi) do update set pembayaran_id = excluded.pembayaran_id;

    n_proses := n_proses + 1;
  end loop;

  insert into public.log_aktivitas (aktor, aksi, sesudah)
  values (auth.uid(), 'impor_riwayat_qris',
          jsonb_build_object('diproses', n_proses, 'tanpa_pemilik', n_kosong, 'dilewati', n_lewat));
  return query select n_proses, n_kosong, n_lewat;
end;
$$;
revoke all on function public.proses_impor_qris() from public, anon, authenticated;
