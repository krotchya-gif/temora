"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputCls } from "./fields";

type ReportRow = { source: string; visits: number; conversions: number };

// Tab Campaign UTM (referensi seo-admin-reference.md §4.5): builder link +
// laporan kunjungan & konversi per source kampanye.
export function UtmTab() {
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    const res = await fetch("/api/admin/utm/report");
    const body = (await res.json()) as { rows: ReportRow[] };
    setRows(body.rows ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchReport();
    } finally {
      setLoading(false);
    }
  }, [fetchReport]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/utm/report")
      .then((res) => res.json())
      .then((body: { rows: ReportRow[] }) => {
        if (!cancelled) setRows(body.rows ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const builtUrl =
    source.trim()
      ? `${window.location.origin}/?utm_source=${encodeURIComponent(source.trim())}${
          medium.trim() ? `&utm_medium=${encodeURIComponent(medium.trim())}` : ""
        }${campaign.trim() ? `&utm_campaign=${encodeURIComponent(campaign.trim())}` : ""}${
          content.trim() ? `&utm_content=${encodeURIComponent(content.trim())}` : ""
        }`
      : "";

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(builtUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard diblokir — biarkan user salin manual.
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">Builder Link UTM</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" hint="Wajib — mis. instagram">
            <input className={inputCls} value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
          <Field label="Medium" hint="mis. social, email">
            <input className={inputCls} value={medium} onChange={(e) => setMedium(e.target.value)} />
          </Field>
          <Field label="Campaign" hint="mis. launch-mvp">
            <input className={inputCls} value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </Field>
          <Field label="Content" hint="opsional — variasi iklan">
            <input className={inputCls} value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
        </div>
        {builtUrl ? (
          <div className="rounded-lg border border-border bg-bg-warm p-3">
            <p className="break-all font-mono text-xs text-text-primary">{builtUrl}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={copyUrl}>
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
              {copied ? "Tersalin" : "Salin Link"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Isi Source untuk generate link.</p>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-text-primary">Laporan per Source</h2>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            Muat Ulang
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Belum ada kunjungan kampanye. Sebar link UTM dan cek di sini — konversi
            tercatat saat vendor signup melalui link ber-UTM.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Kunjungan</th>
                  <th className="py-2">Konversi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.source} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs text-text-primary">{r.source}</td>
                    <td className="py-2 pr-3 text-text-secondary">{r.visits}</td>
                    <td className="py-2 text-text-secondary">{r.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}