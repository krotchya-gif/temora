/**
 * Data demo untuk shell UI (lihat README §Urutan Kerja #5).
 * Bukan data produksi — diganti query Supabase saat wiring task 006/007.
 */

export const DEMO_EVENT_ID = "demo-andi-sinta";

export const demoEvent = {
  id: DEMO_EVENT_ID,
  name: "Pernikahan Andi & Sinta",
  theme: "Wedding",
  dateLabel: "24 Agt 2026",
  location: "Yogyakarta",
  isActive: true,
  photoCount: 142,
  tableCount: 10,
  scanCount: 87,
};

const demoPhotoSources = [
  "photo-1519741497674-611481863552",
  "photo-1464366400600-7168b8af9bc3",
  "photo-1601004896844-dff2b9a3f0a8",
  "photo-1529156069898-49953e39b3ac",
  "photo-1511285560929-80b456fea0bc",
] as const;

const demoTimes = [
  "17.58",
  "18.04",
  "18.11",
  "18.26",
  "18.40",
  "18.52",
  "19.03",
  "19.17",
  "19.25",
  "19.38",
  "19.46",
  "19.59",
];

export type DemoPhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  table: string;
  time: string;
};

export const demoPhotos: DemoPhoto[] = demoTimes.map((time, index) => ({
  id: `demo-${index + 1}`,
  url: `https://images.unsplash.com/${demoPhotoSources[index % demoPhotoSources.length]}?auto=format&fit=crop&w=480&h=600&q=80`,
  width: 480,
  height: 600,
  table: `Meja ${(index % demoEvent.tableCount) + 1}`,
  time,
}));
