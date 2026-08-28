// Fitur AI photobooth yang sementara dinonaktifkan (keputusan 2026-08-28,
// qa-report §6o). Kode tetap utuh — balik flag ke true untuk uji ulang.
//
// - Props AR & Green screen masih bermasalah di uji live → OFF sampai
//   diverifikasi ulang (fix person=NOT background + soft edge & FPS gate
//   sudah terpasang, tinggal dites).
// - Filter warna (3D LUT) AKTIF — bug warna (FLIP_Y leak) sudah diperbaiki.
export const ENABLE_PROPS = false;
export const ENABLE_BACKGROUNDS = false;