# Kredit Aset Filter (LUT) — TEMORA

## Color filter (3D LUT `.cube`) — 43 filter di `public/luts/`

Daftar filter dibaca runtime dari `public/luts/manifest.json` (generate:
`node scripts/sync-luts.mjs`). Sumber aset:

### 1. Film emulation — MIT (8 file)

- **Sumber**: [YahiaAngelo/Film-Luts](https://github.com/YahiaAngelo/Film-Luts) (film-emulation LUTs, berbasis [G'MIC Film Emulation collection](https://gmic.eu))
- **Lisensi**: MIT — bebas dipakai, dimodifikasi, dan dipakai komersial; wajib menyertakan pemberitahuan lisensi (dipenuhi via dokumen ini).

| File di `public/luts/` | Nama asli di repo | Label UI |
|---|---|---|
| `portra-400.cube` | `negative_new/kodak_portra_400.cube` | Portra Hangat |
| `fuji-400h.cube` | `negative_new/fuji_400h.cube` | Fuji Lembut |
| `ektar-100.cube` | `negative_color/kodak_ektar_100.cube` | Ektar Cerah |
| `velvia-50.cube` | `colorslide/fuji_velvia_50.cube` | Velvia Pop |
| `ektachrome-vs.cube` | `colorslide/kodak_ektachrome_100_vs.cube` | Ektachrome |
| `trix-400.cube` | `bw/kodak_tri-x_400.cube` | Tri-X Hitam Putih |
| `fp100c.cube` | `instant_pro/fuji_fp-100c.cube` | Instan Retro |
| `agfa-vista-200.cube` | `negative_color/agfa_vista_200.cube` | Vista 200 |

### 2. RocketStock 35 Free LUTs (35 file) — dikonfirmasi owner

- **Sumber**: paket promo gratis "35 Free LUTs" RocketStock (2017, pond5.com),
  `LUT_3D_SIZE 32` (885 KB/file). File: `Arabica 12.CUBE` … `Zeke 39.CUBE`.
- **Format**: ditulis plugin Adobe Photoshop → urutan indeks **R-outer/B-middle/
  G-inner** (`(r·S+b)·S+g`); parser mendeteksi via header (`order:"rbg"`, §6q).
- **Lisensi**: dikonfirmasi **bebas dipakai (free)** oleh owner TEMORA
  (2026-08-29). File asli memuat header `#Copyright: (C) Copyright 2017
  RocketStock` — disimpan apa adanya; dicatat sebagai keputusan owner.
- **Peringatan operasional**: 35 file × 885 KB ≈ 29,5 MB di repo + hosting;
  di-fetch on-demand hanya saat filter dipilih.

### Lisensi MIT (repo Film-Luts)

```text
MIT License

Copyright (c) Yahia Angelo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
```

## Props AR (stiker wajah)

Dua sumber (2026-08-28):

1. **Twemoji** (CC BY 4.0) — 6 aset di `public/props/`, diunduh dari
   [jdecked/twemoji v15.1.0](https://github.com/jdecked/twemoji) (assets/svg):

   | File | Emoji | Props |
   |---|---|---|
   | `glasses.svg` | 1f453 (kacamata) | Kacamata |
   | `flower.svg` | 1f337 (tulip) | Bunga |
   | `crown.svg` | 1f451 (mahkota) | Mahkota |
   | `party.svg` | 1f382 (topi pesta) | Pesta |
   | `sunglasses.svg` | 1f576 (kacamata hitam) | Hitam |
   | `bow.svg` | 1f380 (pita) | Pita |

   Lisensi CC BY 4.0 — bebas dipakai/modifikasi komersial, wajib atribusi
   (dipenuhi via dokumen ini): *Twemoji © Twitter/X, Inc / jdecked, CC BY 4.0*.

2. **SVG custom TEMORA** — 4 aset di `src/lib/ai/props.ts` (topi fedora,
   telinga kelinci, kumis, halo) memakai token warna design-system §2.1 —
   tanpa kewajiban atribusi.

---

*Diperbarui: 2026-08-29. Sumber alternatif yang pernah dievaluasi: Q-DDL 800+ LUTs (CC BY 4.0, situs offline), Luttie (lisensi internal platform, dilarang redistribusi), CineColor (wajib akun Shopify) — tidak dipakai.*