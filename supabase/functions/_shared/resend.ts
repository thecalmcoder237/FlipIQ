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

  const from = params.from || "FlipIQ <notifications@flipiq.ai>";

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
  if (!resp.ok) {
    throw new Error(`Resend error (${resp.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

