# Kredit Aset Filter (LUT) — TEMORA

## Color filter (3D LUT `.cube`)

File di `public/luts/*.cube` berasal dari repo open-source:

- **Sumber**: [YahiaAngelo/Film-Luts](https://github.com/YahiaAngelo/Film-Luts) (film-emulation LUTs, berbasis [G'MIC Film Emulation collection](https://gmic.eu))
- **Lisensi**: MIT — bebas dipakai, dimodifikasi, dan dipakai komersial; wajib menyertakan pemberitahuan lisensi (dipenuhi via dokumen ini).

### Daftar file yang dipakai

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

Semua file di-copy apa adanya (tanpa modifikasi) dari repo di atas, ukuran `LUT_3D_SIZE 13` (13³ = 2.197 titik).

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

Semua props di `src/lib/ai/props.ts` adalah **SVG custom buatan TEMORA** memakai
token warna design-system §2.1 — tanpa aset pihak ketiga, tanpa kewajiban atribusi.

---

*Diperbarui: 2026-08-28. Sumber alternatif yang pernah dievaluasi: Q-DDL 800+ LUTs (CC BY 4.0, situs offline), Luttie (lisensi internal platform, dilarang redistribusi), CineColor (wajib akun Shopify) — tidak dipakai.*