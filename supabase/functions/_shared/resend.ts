type ResendAttachment = {
  filename: string;
  content: string; // base64
  content_type?: string;
};

export async function sendEmailWithResend(params: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: ResendAttachment[];
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Missing RESEND_API_KEY secret");

  // Default sender MUST be a domain verified in Resend.
  // Configure via Supabase secrets:
  // - RESEND_FROM: e.g. "FlipIQ <notifications@your-verified-domain.com>"
  // Fallback kept for backwards compatibility, but will 403 if flipiq.ai isn't verified.
  const defaultFrom =
    Deno.env.get("RESEND_FROM") || "Pavel REI Team <team@pavelreiproperties.com>";
  let from = String(params.from || defaultFrom).trim();
  // Auto-correct a common misconfiguration: missing closing ">" in "Name <email@domain"
  // This avoids Resend 422 validation errors when a secret was saved without the trailing bracket.
  if (from.includes("<") && !from.includes(">")) from = `${from}>`;
  // #region agent log
  try {
    const match = String(from).match(/@([^>\s]+)>?$/);
    const fromDomain = match?.[1] ? String(match[1]).toLowerCase() : "unknown";
    fetch('http://127.0.0.1:7790/ingest/fff6aa39-69cb-41be-9b17-700a12e67901',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0af06'},body:JSON.stringify({sessionId:'d0af06',runId:'resend',hypothesisId:'H_resend_from',location:'supabase/functions/_shared/resend.ts:from',message:'Resend sendEmailWithResend from resolved',data:{hasResendFromEnv:!!Deno.env.get("RESEND_FROM"),fromDomain,hasOverride:!!params.from,hasAttachments:!!(params.attachments&&params.attachments.length)},timestamp:Date.now()})}).catch(()=>{});
  } catch(e) {}
  // #endregion

  const payload: Record<string, unknown> = {
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  };

  if (params.replyTo) payload.reply_to = params.replyTo;
  if (params.attachments?.length) payload.attachments = params.attachments;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  // #region agent log
  try {
    fetch('http://127.0.0.1:7790/ingest/fff6aa39-69cb-41be-9b17-700a12e67901',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d0af06'},body:JSON.stringify({sessionId:'d0af06',runId:'resend',hypothesisId:'H_resend_status',location:'supabase/functions/_shared/resend.ts:resp',message:'Resend response status',data:{status:resp.status,ok:resp.ok,bodyPrefix:String(text||'').slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
  } catch(e) {}
  // #endregion
  if (!resp.ok) {
    throw new Error(`Resend error (${resp.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

