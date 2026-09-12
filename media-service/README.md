# TEMORA media service

Upload isi folder ini ke document root `media.temora.site`, buat `config.local.php` dari contoh, lalu isi secret yang sama dengan `HOSTINGER_STORAGE_SECRET` pada aplikasi Next.js. Pastikan `public/` dan `private/` writable oleh PHP; folder `private/` harus tetap tidak bisa diakses langsung. Endpoint download bernama `media-get.php`.

## Permission (wajib — insiden 2026-09-10)

`upload.php` menulis folder `0755` + file `0644`. File upload PHP default-nya
`0600` milik user proses PHP — static handler (user berbeda) tidak bisa
membaca dan melempar **404 padahal file ada di disk** (gejala: thumbnail grid
vendor mati, folder terdeteksi ada/403, cache-buster tetap 404). Area `private/`
tetap aman karena `private/.htaccess` (`Require all denied`) menutup akses HTTP
di semua level + baca file hanya lewat `media-get.php`.

File yang telanjur `0600`/`0750` sebelum patch: recurse sekali via File Manager
(folder → Permissions → 0755/0644 → Recurse into subdirectories) atau SSH:

```
find public private -type d -exec chmod 755 {} +
find public private -type f -exec chmod 644 {} +
```

## Anti-stale: deploy service ini MANUAL (jebakan 2026-09-10)

Folder ini **tidak ikut Git deploy** aplikasi Next.js. Edit di repo tidak sampai
ke server sampai file di-upload ulang via File Manager/FTP. Insiden thumbnail
404 sembuh di repo lebih dulu, tetapi di server tetap sakit sampai `upload.php`
baru ditimpa manual.

Verifikasi wajib tiap selesai menyentuh folder ini:

1. Upload file yang diubah, timpa yang lama (jangan upload sebagai salinan).
   `.htaccess` juga manual — perubahan CORS di repo tidak sampai ke server
   sebelum di-upload ulang.
2. Ambil 1 foto test dari photobooth → pastikan thumbnail tampil di galeri
   vendor tanpa chmod manual (membuktikan `upload.php` baru yang jalan).
3. Buka 1 thumb lama yang sudah di-recurse → tetap 200 (tidak regresi).
4. Frame publik wajib punya CORS (dipakai canvas compositing tamu):
   `curl -sI -H "Origin: https://temora.site" https://media.temora.site/public/frames/<vendor>/<event>/frame.png`
   → harus ada `access-control-allow-origin: *` dan status 200. Tanpa header
   ini, frame gagal dimuat `crossOrigin="anonymous"` dan foto tamu tersimpan
   tanpa frame (diam-diam).
