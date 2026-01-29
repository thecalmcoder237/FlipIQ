import { handleCors, json } from "../_shared/cors.ts";
import { dealSummaryEmailHtml } from "../_shared/emailTemplates.ts";
import { sendEmailWithResend } from "../_shared/resend.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const recipients: string[] = Array.isArray(body?.recipients) ? body.recipients : [];
    const deal = body?.deal || {};
    const metrics = body?.metrics || {};

    if (!recipients.length) {
      return json({ error: "recipients[] is required" }, { status: 400 });
    }

    const downloadUrl: string | undefined = body?.downloadUrl;
    const pdfBase64: string | undefined = body?.pdfBase64;
    const pdfFileName: string = body?.pdfFileName || "Deal_Report.pdf";

    const html = dealSummaryEmailHtml({
      dealAddress: deal?.address || "Deal",
      purchasePrice: deal?.purchasePrice,
      arv: deal?.arv,
      rehabCosts: deal?.rehabCosts,
      netProfit: metrics?.netProfit,
      roi: metrics?.roi,
      score: metrics?.score,
      risk: metrics?.risk,
      downloadUrl,
    });

    const attachments = pdfBase64
      ? [
          {
            filename: pdfFileName,
            content: pdfBase64,
            content_type: "application/pdf",
          },
        ]
      : undefined;

    const subject = `Deal Summary Report: ${deal?.address || "Deal"}`;
    const resendResult = await sendEmailWithResend({
      to: recipients,
      subject,
      html,
      attachments,
    });

    return json({ ok: true, downloadUrl, resendResult });
  } catch (e) {
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
});

