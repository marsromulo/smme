type SendGridEmailAddress = {
  email: string;
  name?: string;
};

type SendGridMessage = {
  html: string;
  subject: string;
  text: string;
  to: SendGridEmailAddress;
};

const defaultFromEmail = "admin@depedbaguio-sgod-smme.com";
const defaultFromName = "SDO Baguio SMME";

function getSendGridApiKey() {
  return process.env.SENDGRID_API_KEY ?? "";
}

export function getPlatformUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function paragraph(value: string) {
  return `<p style="margin:0 0 14px;color:#24324a;line-height:1.55;">${escapeHtml(value)}</p>`;
}

export function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;color:#607089;font-weight:700;width:150px;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;color:#17243a;font-weight:700;">${escapeHtml(value)}</td>
    </tr>
  `;
}

export async function sendSendGridEmail(message: SendGridMessage) {
  const apiKey = getSendGridApiKey();

  if (!apiKey) {
    return { reason: "SENDGRID_API_KEY is not configured.", sent: false };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    body: JSON.stringify({
      content: [
        {
          type: "text/plain",
          value: message.text,
        },
        {
          type: "text/html",
          value: message.html,
        },
      ],
      from: {
        email: process.env.SENDGRID_FROM_EMAIL ?? defaultFromEmail,
        name: process.env.SENDGRID_FROM_NAME ?? defaultFromName,
      },
      personalizations: [
        {
          to: [message.to],
        },
      ],
      subject: message.subject,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`SendGrid email failed with status ${response.status}. ${responseText}`);
  }

  return { sent: true };
}
