import { handleCors, json } from "../_shared/cors.ts";
import { loanProposalEmailHtml } from "../_shared/emailTemplates.ts";
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

    const arv = Number(deal?.arv) || 0;
    const requestedLoanAmount = Math.round(arv * 0.8);
    const ltvArv = arv > 0 ? (requestedLoanAmount / arv) * 100 : 80;

    const downloadUrl: string | undefined = body?.downloadUrl;
    const pdfBase64: string | undefined = body?.pdfBase64;
    const pdfFileName: string = body?.pdfFileName || "Loan_Proposal.pdf";

    const html = loanProposalEmailHtml({
      dealAddress: deal?.address || "Deal",
      arv: deal?.arv,
      requestedLoanAmount,
      ltvArv,
      netProfit: metrics?.netProfit,
      roi: metrics?.roi,
      score: metrics?.score,
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

    const subject = `Loan Proposal: ${deal?.address || "Deal"} (80% ARV LTV)`;
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

