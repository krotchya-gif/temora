import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Audit — TEMORA Admin",
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const ACTION_BADGE: Record<string, string> = {
  set_tier: "bg-accent/15 text-accent",
  edit_vendor: "bg-dusty-blue/15 text-dusty-blue",
  ban_vendor: "bg-danger/15 text-danger",
  unban_vendor: "bg-success/15 text-success",
  delete_vendor: "bg-danger/15 text-danger",
  set_event_status: "bg-bg-warm text-text-secondary",
  delete_photo: "bg-warning/15 text-warning",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const admin = createAdminClient();

  const [{ data, count }] = await Promise.all([
    admin
      .from("admin_audit_logs")
      .select("id, actor_email, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    admin
      .from("admin_audit_logs")
      .select("id", { count: "exact", head: true }),
  ]);

  const rows = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Jejak Audit</h1>
        <p className="text-sm text-text-secondary">
          {total} aksi admin tercatat. Log bersifat append-only.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Aktor</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      ACTION_BADGE[row.action] ?? "bg-bg-warm text-text-secondary"
                    }`}
                  >
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-primary">{row.actor_email}</td>
                <td className="px-4 py-3">
                  {row.target_type === "vendor" ? (
                    <Link
                      href={`/admin/vendors/${row.target_id}`}
                      className="font-mono text-xs text-dusty-blue hover:underline"
                    >
                      vendor/{String(row.target_id).slice(0, 8)}…
                    </Link>
                  ) : row.target_type === "event" ? (
                    <Link
                      href={`/admin/events/${row.target_id}`}
                      className="font-mono text-xs text-dusty-blue hover:underline"
                    >
                      event/{String(row.target_id).slice(0, 8)}…
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-text-secondary">
                      {row.target_type}/{String(row.target_id ?? "").slice(0, 8)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-secondary">
                  Belum ada aksi tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/admin/audit?page=${page - 1}`}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-dusty-blue hover:bg-bg-warm"
            >
              ← Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-text-secondary">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/audit?page=${page + 1}`}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-dusty-blue hover:bg-bg-warm"
            >
              Berikutnya →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
