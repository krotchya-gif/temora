# TEMORA media service

Upload isi folder ini ke document root `media.temora.site`, buat `config.local.php` dari contoh, lalu isi secret yang sama dengan `HOSTINGER_STORAGE_SECRET` pada aplikasi Next.js. Pastikan `public/` dan `private/` writable oleh PHP; folder `private/` harus tetap tidak bisa diakses langsung. Endpoint download bernama `media-get.php`.
