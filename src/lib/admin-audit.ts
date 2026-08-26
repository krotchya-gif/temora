// Penulisan jejak audit admin (task 019, database.md §2.6b).
// Selalu service role — hanya API route superadmin yang memanggil.

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAction =
  | "set_tier"
  | "edit_vendor"
  | "ban_vendor"
  | "unban_vendor"
  | "delete_vendor"
  | "set_event_status"
  | "delete_photo"
  | "showcase_upload"
  | "showcase_edit"
  | "showcase_delete";

export async function logAdminAction(input: {
  actorId: string;
  actorEmail: string;
  action: AdminAction;
  targetType: "vendor" | "event" | "photo";
  targetId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_audit_logs").insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      detail: input.detail ?? {},
    });
    if (error) {
      console.error("[admin-audit]", error.message);
    }
  } catch (err) {
    // Kegagalan audit tidak boleh menggagalkan aksi utama; tetap terlihat di logs.
    console.error("[admin-audit] fatal:", err);
  }

  // Duplikasi ringkas ke stdout agar tetap terlihat di Vercel Logs.
  console.info(
    "[admin]",
    JSON.stringify({
      action: input.action,
      actor: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ...input.detail,
    }),
  );
}
