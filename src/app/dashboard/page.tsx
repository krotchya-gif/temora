import type { Metadata } from "next";
import { CalendarDays, Camera, Images } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const stats = [
  { label: "Event aktif", value: "0", icon: CalendarDays },
  { label: "Total foto", value: "0", icon: Camera },
  { label: "Momen disimpan tamu", value: "0", icon: Images },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary">
          Ringkasan event dan momen yang terkumpul.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <Icon className="h-4 w-4 text-dusty-blue" aria-hidden />
              </div>
              <p className="font-mono text-3xl tracking-tight text-text-primary">
                {stat.value}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="px-6 py-12 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
          <Camera className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-2xl text-text-primary">
          Belum ada event. Buat event pertamamu.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Upload frame, generate QR meja, lalu bagikan ke tamu. Semuanya bisa
          disiapkan dalam hitungan menit.
        </p>
        <Button href="/dashboard/events/new" className="mt-6">
          Buat Event Pertama
        </Button>
      </Card>
    </div>
  );
}
