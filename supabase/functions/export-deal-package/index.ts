/** Deno global provided by Supabase Edge Runtime */
declare const Deno: { serve(handler: (req: Request) => Promise<Response> | Response): void };

// @ts-expect-error - Deno resolves npm:jszip at runtime
import JSZip from "npm:jszip@3.10.1";
import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";
import { dealPackageEmailHtml } from "../_shared/emailTemplates.ts";
import { sendEmailWithResend } from "../_shared/resend.ts";

function toSafePathPart(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function uint8ToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const dealId = body?.dealId;
    const deal = body?.deal || {};
    const metrics = body?.metrics || {};
    const propertyIntelligence = body?.propertyIntelligence || null;
    const rehabSOW = body?.rehabSOW || body?.rehabSow || null;

    // Build zip contents (best-effort, "everything about the deal" available to this function)
    const zip = new JSZip();
    zip.file("deal.json", JSON.stringify(deal, null, 2));
    zip.file("metrics.json", JSON.stringify(metrics, null, 2));
    if (propertyIntelligence) zip.file("property-intelligence.json", JSON.stringify(propertyIntelligence, null, 2));
    if (rehabSOW) zip.file("rehab-sow.md", String(rehabSOW));

    const comps = (propertyIntelligence?.recentComps || deal?.comps || []) as unknown[];
    if (Array.isArray(comps) && comps.length) {
      const rows = comps.slice(0, 50).map((c: any) => [
        c?.address ?? "",
        c?.price ?? c?.salePrice ?? c?.soldPrice ?? "",
        c?.bedrooms ?? "",
        c?.bathrooms ?? "",
        c?.sqft ?? "",
        c?.daysOnMarket ?? c?.dom ?? "",
      ]);
      const header = ["address", "price", "bedrooms", "bathrooms", "sqft", "dom"];
      const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      zip.file("comps.csv", csv);
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    // Upload to Storage and create a signed URL
    const supabase = createSupabaseAdminClient();
    const bucket = "reports";
    const safeDealId = toSafePathPart(dealId || deal?.id || "unknown");
    const date = new Date().toISOString().split("T")[0];
    const path = `deal-packages/${safeDealId}/full-deal-package-${date}.zip`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, new Blob([zipBytes], { type: "application/zip" }), {
        contentType: "application/zip",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedError) throw signedError;

    const downloadUrl = signed?.signedUrl;

    // Optional email send (same principle)
    const recipients: string[] = Array.isArray(body?.recipients) ? body.recipients : [];
    if (recipients.length) {
      const html = dealPackageEmailHtml({
        dealAddress: deal?.address || "Deal",
        netProfit: metrics?.netProfit,
        roi: metrics?.roi,
        score: metrics?.score,
        risk: metrics?.risk,
        downloadUrl,
      });

      await sendEmailWithResend({
        to: recipients,
        subject: `Full Deal Package: ${deal?.address || "Deal"}`,
        html,
        attachments: [
          {
            filename: `Full_Deal_Package_${(deal?.address || "Deal").toString().replace(/\s+/g, "_")}.zip`,
            content: uint8ToBase64(zipBytes),
            content_type: "application/zip",
          },
        ],
      });
    }

    return json({ ok: true, downloadUrl });
  } catch (e) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
});

