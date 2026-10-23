import { privacyHoldActive } from "@/lib/privacy-hold";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { makeToken } from "@/lib/tokens";
import { reminderEmail } from "@/lib/email";
import type { EntityType } from "@/lib/constants";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const incoming = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    incoming.length !== expected.length ||
    !timingSafeEqual(incoming, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    secret.length < 32 ||
    !process.env.SUPABASE_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SITE_URL
  )
    return NextResponse.json(
      { error: "Lifecycle configuration is incomplete." },
      { status: 503 },
    );
  const admin = supabaseAdmin();
  const cleanup = await admin.rpc("retention_cleanup");
  if (cleanup.error)
    return NextResponse.json(
      { error: "Cleanup could not complete." },
      { status: 503 },
    );
  if (privacyHoldActive())
    return NextResponse.json(
      { cleanup: true, reminders: "paused" },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    return NextResponse.json(
      { error: "Cleanup completed; reminder email is not configured." },
      { status: 503 },
    );
  const started = Date.now();
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0,
    failed = 0;
  let pending = false;
  while (Date.now() - started < 240000) {
    const { data, error } = await admin.rpc("claim_reminders", { p_limit: 50 });
    if (error)
      return NextResponse.json(
        { error: "Reminders could not be loaded.", sent, failed },
        { status: 503 },
      );
    const records = (data || []) as {
      delivery_id: string;
      entity_type: EntityType;
      entity_id: string;
      listing_expires_at: string;
      email: string;
      title: string;
    }[];
    if (!records.length) {
      pending = false;
      break;
    }
    pending = true;
    for (const record of records) {
      // Resend's default limit is two requests/second; no additional worker is needed.
      await new Promise((resolve) => setTimeout(resolve, 550));
      try {
        const token = makeToken(
          {
            kind: record.entity_type,
            id: record.entity_id,
            version: record.listing_expires_at,
            until: Date.parse(record.listing_expires_at) + 30 * 86400000,
          },
          secret,
        );
        const message = reminderEmail(
          record.entity_type,
          record.title,
          `${siteUrl()}/renew?t=${token}`,
          process.env.PROJECT_CONTACT_EMAIL,
        );
        const { error: sendError } = await resend.emails.send(
          { from: process.env.EMAIL_FROM, to: record.email, ...message },
          { idempotencyKey: `reminder/${record.delivery_id}` },
        );
        if (sendError) {
          failed++;
          continue;
        }
        const complete = await admin.rpc("complete_reminder", {
          p_id: record.delivery_id,
        });
        if (complete.error) {
          failed++;
          continue;
        }
        sent++;
      } catch {
        failed++;
      }
    }
  }
  return NextResponse.json(
    { sent, failed, pending },
    { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
