# Pertanyaan untuk Tim Backend — Pilketum BCC 2026

Dari: tim frontend
Acuan: dokumentasi "API Pilketum BCC" yang kami terima 17 Nov 2026

Semua endpoint di dokumentasi sudah kami implementasikan di frontend dan kami uji terhadap mock yang meniru dokumentasi tersebut. Masih ada beberapa hal yang belum tertulis atau masih ambigu. Untuk setiap pertanyaan kami tuliskan **asumsi frontend saat ini** dan **dampaknya kalau ternyata berbeda**, supaya mudah dijawab "ya, sesuai" atau "tidak, yang benar …".

---

## Gambaran singkat: cara frontend memanggil API

Browser **tidak** memanggil API backend secara langsung. Alurnya:

```
browser ──(same-origin /api/*, cookie httpOnly)──▶ server Next.js frontend ──(Authorization: Bearer <token>)──▶ backend /api/*
```

- Saat login, server Next.js menerima `token` dari backend, menyimpannya di cookie httpOnly, lalu menghapus `token` dari response sebelum diteruskan ke browser. Token tidak pernah bisa dibaca JavaScript di browser (bilik voting dipakai bergantian, dan spesifikasi melarang token disimpan di `sessionStorage`).
- Request lainnya diteruskan apa adanya ke backend dengan header `Authorization: Bearer <token>`.
- Karena itu **CORS tidak diperlukan**: browser hanya berbicara dengan domain frontend.

Konsekuensinya ada di pertanyaan #1.

---

## A. Prioritas tinggi (perlu dijawab sebelum hari-H)

### 1. Alamat IP klien di balik server frontend

Semua request ke backend datang dari **IP server frontend**, bukan IP pemilih. Frontend sudah mengirim IP asli pemilih di header `X-Forwarded-For`.

- **Pertanyaan:** Apakah backend bisa mempercayai `X-Forwarded-For` dari IP server frontend (misalnya lewat allowlist proxy / trust proxy)?
- **Dampak kalau tidak:** rate limit login (`RATE_LIMITED`) dan batas 300 koneksi stream per IP akan menghitung **semua pemilih sebagai satu IP**. Di hari-H, beberapa salah ketik password saja bisa mengunci login untuk semua orang.
- Catatan: tanpa BFF pun, pemilih di satu ruangan kampus kemungkinan besar keluar dari IP NAT yang sama.

### 2. Isi lengkap objek hasil per kandidat

Contoh di dokumentasi terpotong (`"...": "..."`) untuk:

- `GET /api/display` layar `final_results` → `results[]`
- `GET /api/display` layar `most_votes` → `winners[]`
- `GET /api/admin/results` → `results.candidates[]`

**Asumsi frontend:** ketiganya punya field yang sama, yaitu:

```json
{
  "id": 2,
  "ballot_number": 2,
  "full_name": "Candidate Name 02",
  "study_program": "Teknik Informatika",
  "class_year": 2023,
  "photo_url": "https://... atau null",
  "votes": 66,
  "share": 55.0,
  "rank": 1
}
```

- **Pertanyaan:** Apakah benar ketiganya selalu berisi semua field di atas?
- **Dampak kalau ada yang tidak dikirim:** validasi response gagal, sehingga layar hasil di videotron dan halaman Results panitia **tidak tampil**.

### 3. Isi `candidates` di layar `winner_suspense`

Dokumentasi hanya menulis "`candidates`".

- **Asumsi frontend:** bentuknya sama dengan line-up di `voting_opens_soon`: `{ id, ballot_number, full_name, study_program, class_year, photo_url }`, tanpa `votes`.
- **Pertanyaan:** Benar begitu?
- Info: desain hanya menampilkan kartu "?" dengan "Candidate 01, 02, 03", jadi frontend hanya memakai `ballot_number`.

### 4. `photo_url`

- **Pertanyaan a:** Untuk kandidat yang belum punya foto, apakah `photo_url` bernilai `null`? (Asumsi frontend: ya. Ini dasar badge "Needs a photo" dan pesan kenapa voting belum bisa dibuka.)
- **Pertanyaan b:** Apakah `photo_url` selalu URL **absolut**? Di domain apa (contoh: `https://<domain-api>/uploads/candidates/...`)?
- **Dampak:** frontend perlu mendaftarkan host foto saat build (untuk optimasi gambar Next.js). Kalau URL-nya relatif (`/uploads/...`), browser akan mencarinya di domain frontend dan foto tidak tampil.
- **Pertanyaan c:** Apakah URL foto berubah setiap kali foto diganti (supaya cache aman)?

### 5. Akses untuk uji coba

Mohon disiapkan:

- URL **staging** backend.
- Akun uji (bukan akun asli anggota):
  - 1 pemilih **tanpa** 2FA, belum vote,
  - 1 pemilih yang **sudah** vote,
  - 1 pemilih **dengan** 2FA (kalau memungkinkan),
  - 1 akun panitia.
- Cara mereset data staging (status voting, suara, kandidat) supaya skenario bisa diuji berulang.

Frontend punya pemeriksa otomatis (read-only, tidak pernah vote atau mengubah status) yang langsung memvalidasi semua response staging terhadap dokumentasi.

---

## B. Prioritas sedang

### 6. Waktu vote (`voted_at`)

- **Pertanyaan:** Bisakah `GET /api/me` (dan response login) menyertakan `voted_at`?
- **Kenapa:** layar "Thanks, your vote is in" dan "You've already voted" di desain menampilkan "Submitted Nov 20, 2026 at 10:24 WIB".
- **Saat ini:** frontend memakai jam perangkat ketika vote berhasil, dan baris waktu disembunyikan di layar "already voted".

### 7. Pengaman untuk dua panitia yang aktif bersamaan

- **Pertanyaan:** Bisakah `POST /api/admin/election/{open|close|reopen}` menerima `expected_status` opsional, dan `PUT /api/admin/display` menerima `expected_screen` opsional? Backend menolak (409) kalau keadaannya sudah berubah.
- **Saat ini:**
  - **Status voting:** aksi yang sudah basi ditolak backend dengan `INVALID_STATE`, dan frontend menampilkannya sebagai konflik. Ini sudah cukup.
  - **Layar display:** pilihan terakhir yang menang. Panitia lain baru melihat perubahannya sekitar 4 detik kemudian, jadi dua panitia bisa saling menimpa layar tanpa sadar.

### 8. Response `PUT /api/admin/display`

- **Pertanyaan:** Apa isi response-nya? Belum ada di dokumentasi.
- **Saat ini:** frontend menerima response 2xx apa pun, lalu memuat ulang `GET /api/admin/overview`.

### 9. Syarat membuka voting

- Dokumentasi: harus **tepat 3** kandidat dan semuanya punya foto (`CANDIDATES_INCOMPLETE`).
- Spesifikasi frontend menulis: voting ditolak kalau kandidat **kurang dari 2** atau ada yang belum lengkap.
- **Pertanyaan:** Mana yang benar? Frontend sekarang mengikuti backend (tepat 3) dan menjelaskan alasannya di dialog "Open voting".

### 10. `opened_at` setelah close / reopen

- **Asumsi frontend:** `opened_at` tetap terisi setelah voting pernah dibuka sekali (juga setelah close dan reopen). Frontend memakainya untuk mengunci halaman kandidat selamanya.
- **Pertanyaan:** Benar? Apakah ada kondisi yang mengembalikannya ke `null` (misalnya reset data)?

### 11. Field objek `voter` di login dan `/me`

- **Pertanyaan:** Apakah `email`, `class_year`, `study_program`, `department` selalu terisi di response login dan `/me`, atau bisa `null` (seperti `email` di voter list)?
- **Saat ini:** frontend menerima `null` untuk semuanya, untuk berjaga-jaga.

### 12. Request tanpa header `Origin`

- **Pertanyaan:** Apakah backend menerima request server-ke-server yang **tidak** membawa header `Origin`? (`ALLOWED_ORIGINS` tidak relevan untuk frontend karena browser tidak memanggil API langsung.)
- **Dampak kalau ditolak:** frontend perlu menambahkan header `Origin` di setiap request yang diteruskan.

### 13. Stream SSE di balik proxy

- **Pertanyaan:** Apakah proxy di depan backend (nginx dan sejenisnya) sudah dikonfigurasi supaya **tidak mem-buffer** `/api/display/stream` dan `/api/admin/stream` (misalnya `proxy_buffering off` atau header `X-Accel-Buffering: no`), dan tidak memutus koneksi idle sebelum 30 detik?
- **Saat ini:** kalau stream gagal, layar videotron otomatis beralih ke polling `GET /api/display` tiap 3 detik, jadi tetap jalan, hanya lebih lambat.

### 14. Detail rate limit login

- **Pertanyaan:** Berapa kali percobaan sebelum `RATE_LIMITED`, berapa lama jendela waktunya, dan apakah header `Retry-After` **selalu** dikirim?
- **Kenapa:** pesan di UI menampilkan "Try again in N seconds" kalau `Retry-After` ada.

### 15. 2FA: pilihan perangkat

- **Pertanyaan:** Kalau akun punya lebih dari satu perangkat, apakah `device_id` perlu dikirim di setiap percobaan kode, atau cukup memakai perangkat default?
- **Saat ini:** frontend menampilkan dropdown perangkat kalau perangkatnya lebih dari satu dan mengirim `device_id` yang dipilih.

---

### 20. List kosong tidak dikirim (temuan dari staging, 17 Nov 2026)

`GET /api/display` (dan event di `/api/display/stream`) saat belum ada kandidat mengirim:

```json
{ "screen": "voting_opens_soon", "status": "not_started" }
```

Field `candidates` **tidak ada sama sekali**, padahal di dokumentasi ada. Kemungkinan karena `omitempty` pada slice kosong / `nil` di Go.

- **Permintaan:** kirim list kosong sebagai `[]` (bukan dihilangkan atau `null`) untuk semua field berbentuk list: `candidates`, `results`, `winners`, `items`, `leaders`, `missions`, `devices`.
- **Saat ini:** frontend sudah dibuat toleran (field yang hilang atau `null` dianggap `[]`), jadi layar tidak rusak. Tapi `[]` membuat kontraknya jelas untuk klien lain.

## C. Prioritas rendah (konfirmasi saja)

### 16. Batas panjang field kandidat

| Field       | Backend      | Spesifikasi frontend | Dipakai frontend |
| ----------- | ------------ | -------------------- | ---------------- |
| `full_name` | 100 karakter | 80 karakter          | 80               |
| poin misi   | 200 karakter | 160 karakter         | 160              |

Frontend memakai batas yang lebih ketat. Apakah ini oke?

### 17. Bahasa `study_program`

Contoh di dokumentasi berbahasa Indonesia ("Sistem Informasi"), sedangkan UI dan desain berbahasa Inggris ("Information Systems"). Form kandidat menyediakan dropdown program studi FILKOM dalam bahasa Inggris.

- **Pertanyaan:** Bahasa mana yang mau ditampilkan di surat suara? Apakah backend punya daftar baku program studi?

### 18. Nama tampilan akun panitia

Akun panitia hanya punya `username`, sedangkan desain menampilkan "Election Committee" di topbar. Saat ini frontend menampilkan `username`. Apakah ada field nama tampilan?

### 19. Format pesan error

Frontend hanya membaca `error.code` dan mengabaikan `error.message` (sesuai catatan di dokumentasi). Mohon `code` tidak diubah tanpa pemberitahuan. Daftar `code` yang dipakai frontend persis sama dengan tabel "Daftar kode error" di dokumentasi.

---

## Ringkasan yang kami butuhkan

| #     | Topik                                                   | Jenis jawaban                    |
| ----- | ------------------------------------------------------- | -------------------------------- |
| 1     | `X-Forwarded-For` dipercaya                             | Ya / tidak + cara konfigurasi    |
| 2–3   | Field lengkap objek hasil & `winner_suspense`           | Konfirmasi / contoh JSON lengkap |
| 4     | `photo_url` (null, absolut, domain)                     | Konfirmasi + domain              |
| 5     | Staging, akun uji, cara reset                           | URL + akun                       |
| 6–8   | `voted_at`, `expected_*`, response `PUT /admin/display` | Bisa / tidak                     |
| 9–15  | Aturan & detail teknis                                  | Konfirmasi                       |
| 20    | List kosong dikirim sebagai `[]`                        | Ya / tidak                       |
| 16–19 | Konfirmasi kecil                                        | Konfirmasi                       |

Terima kasih! Kalau lebih mudah, jawaban bisa langsung ditulis per nomor di file ini.
