import { handleCors, json } from "../_shared/cors.ts";
import { businessDeckEmailHtml } from "../_shared/emailTemplates.ts";
import { sendEmailWithResend } from "../_shared/resend.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const recipients: string[] = Array.isArray(body?.recipients) ? body.recipients : [];
    if (!recipients.length) return json({ error: "recipients[] is required" }, { status: 400 });

    const deal = body?.deal || {};
    const metrics = body?.metrics || {};

    const downloadUrl: string | undefined = body?.downloadUrl;
    const shareUrl: string | undefined = body?.shareUrl;
    const pdfBase64: string | undefined = body?.pdfBase64;
    const pdfFileName: string = body?.pdfFileName || "Business_Deck.pdf";
    const deckTitle: string | undefined = body?.deckTitle;

    const html = businessDeckEmailHtml({
      deckTitle,
      dealAddress: deal?.address || "Deal",
      netProfit: metrics?.netProfit,
      roi: metrics?.roi,
      score: metrics?.score,
      risk: metrics?.risk,
      downloadUrl,
      shareUrl,
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

    const subject = `${deckTitle || "Business Deck"}: ${deal?.address || "Deal"}`;
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

