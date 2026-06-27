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

type EmailTemplateStatus = "approved" | "rejected" | "resubmit" | "upload" | "registration" | "info";

type EmailTemplateDetail = {
  label: string;
  value: string;
  tone?: EmailTemplateStatus;
};

type EmailTemplateAction = {
  href: string;
  label: string;
};

type EmailTemplateOptions = {
  action?: EmailTemplateAction | null;
  details: EmailTemplateDetail[];
  fileNames?: string[];
  greeting: string;
  hideHeaderBadge?: boolean;
  hideTitleIcon?: boolean;
  intro: string[];
  status?: EmailTemplateStatus;
  statusLabel?: string;
  title: string;
};

const defaultFromEmail = "admin@depedbaguio-sgod-smme.com";
const defaultFromName = "SDO Baguio SMME";
const defaultEmailLogoUrl = "https://depedbaguio-sgod-smme.com/assets/logos/sdobc-smme-logo-cutout.png";

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

export function escapeHtml(value: string) {
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

function statusColors(status: EmailTemplateStatus = "info") {
  if (status === "approved") {
    return {
      background: "#e9f8ed",
      border: "#9fd9aa",
      color: "#078333",
      icon: "&#10003;",
      label: "Approved",
    };
  }

  if (status === "rejected") {
    return {
      background: "#fff0f0",
      border: "#f3b4b4",
      color: "#b42318",
      icon: "NO",
      label: "Rejected",
    };
  }

  if (status === "resubmit") {
    return {
      background: "#fff7df",
      border: "#f2d072",
      color: "#9a6700",
      icon: "RS",
      label: "Resubmit",
    };
  }

  if (status === "upload") {
    return {
      background: "#eaf2ff",
      border: "#a9c7ff",
      color: "#0047c2",
      icon: "UP",
      label: "Upload",
    };
  }

  if (status === "registration") {
    return {
      background: "#eef6ff",
      border: "#a9c7ff",
      color: "#0047c2",
      icon: "",
      label: "Registration",
    };
  }

  return {
    background: "#eef6ff",
    border: "#a9c7ff",
    color: "#0047c2",
    icon: "i",
    label: "Notice",
  };
}

function detailIcon(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("service")) {
    return "S";
  }

  if (normalized.includes("document") || normalized.includes("requirement")) {
    return "D";
  }

  if (normalized.includes("status")) {
    return "S";
  }

  if (normalized.includes("note")) {
    return "N";
  }

  if (normalized.includes("school")) {
    return "SC";
  }

  if (normalized.includes("email")) {
    return "@";
  }

  if (normalized.includes("contact")) {
    return "T";
  }

  return "-";
}

function renderStatusPill(label: string, status: EmailTemplateStatus = "info") {
  const colors = statusColors(status);
  const icon = colors.icon ? `${colors.icon} ` : "";

  return `<span style="display:inline-block;padding:6px 10px;border:1px solid ${colors.border};border-radius:8px;background:${colors.background};color:${colors.color};font-size:15px;font-weight:800;line-height:1;">${icon}${escapeHtml(label)}</span>`;
}

function renderDetailRows(details: EmailTemplateDetail[]) {
  return details
    .map((item, index) => {
      const value = item.tone ? renderStatusPill(item.value, item.tone) : escapeHtml(item.value);
      const border = index === 0 ? "" : "border-top:1px solid #cfe0f5;";

      return `
        <tr>
          <td style="${border}padding:13px 16px 13px 18px;width:230px;vertical-align:top;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:34px;height:34px;border-radius:50%;background:#004fc4;color:#ffffff;text-align:center;font-size:15px;font-weight:800;line-height:34px;">${detailIcon(item.label)}</td>
                <td style="padding-left:14px;color:#0047c2;font-size:15px;font-weight:800;white-space:nowrap;">${escapeHtml(item.label)}</td>
              </tr>
            </table>
          </td>
          <td style="${border}padding:13px 18px;vertical-align:middle;color:#071538;font-size:15px;font-weight:800;line-height:1.45;">${value}</td>
        </tr>
      `;
    })
    .join("");
}

function renderFileList(fileNames: string[] = []) {
  if (fileNames.length === 0) {
    return "";
  }

  const items = fileNames.map((fileName) => `<li style="margin:0 0 4px;">${escapeHtml(fileName)}</li>`).join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 10px;">
      <tr>
        <td style="width:48px;vertical-align:top;">
          <div style="width:40px;height:40px;border-radius:50%;background:#e8f1ff;color:#004fc4;text-align:center;font-size:18px;line-height:40px;font-weight:900;">F</div>
        </td>
        <td>
          <h2 style="margin:0 0 8px;color:#0047c2;font-size:18px;line-height:1.2;">Reviewed file(s)</h2>
          <ul style="margin:0;padding-left:18px;color:#071538;font-size:15px;line-height:1.5;">${items}</ul>
        </td>
      </tr>
    </table>
  `;
}

export function buildSmmeEmailTemplate({
  action,
  details,
  fileNames = [],
  greeting,
  hideHeaderBadge = false,
  hideTitleIcon = false,
  intro,
  status = "info",
  statusLabel,
  title,
}: EmailTemplateOptions) {
  const colors = statusColors(status);
  const platformUrl = getPlatformUrl();
  const logoUrl =
    process.env.SMME_EMAIL_LOGO_URL ??
    process.env.SENDGRID_LOGO_URL ??
    (platformUrl ? `${platformUrl}/assets/logos/sdobc-smme-logo-cutout.png` : defaultEmailLogoUrl);
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="68" height="68" alt="SMME logo" style="display:block;width:68px;height:68px;border:0;object-fit:contain;">`
    : `<div style="width:68px;height:68px;border-radius:50%;background:#ffffff;text-align:center;line-height:68px;color:#003486;font-size:28px;font-weight:900;">S</div>`;
  const introHtml = intro
    .map((item) => `<p style="margin:0 0 12px;color:#151b2d;font-size:16px;line-height:1.55;">${escapeHtml(item)}</p>`)
    .join("");
  const actionHtml = action
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0;border-top:2px solid #2d75e8;padding-top:18px;">
        <tr>
          <td style="width:250px;">
            <a href="${escapeHtml(action.href)}" style="display:inline-block;padding:13px 22px;border-radius:7px;background:#0052d9;color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;">${escapeHtml(action.label)}</a>
          </td>
          <td style="color:#071538;font-size:15px;line-height:1.45;">You may sign in to the SMME Platform to view the related details.</td>
        </tr>
      </table>
    `
    : "";
  const badgeLabel = statusLabel ?? colors.label;
  const badgeIcon = colors.icon ? `${colors.icon} ` : "";
  const headerBadgeHtml = hideHeaderBadge
    ? ""
    : `<span style="display:inline-block;padding:9px 16px;border-radius:999px;background:#ffffff;color:${colors.color};font-size:15px;font-weight:900;text-transform:uppercase;">${badgeIcon}${escapeHtml(badgeLabel)}</span>`;
  const titleIconHtml = hideTitleIcon
    ? ""
    : `
      <td style="width:84px;vertical-align:top;">
        <div style="width:66px;height:66px;border:3px solid #0052d9;border-radius:50%;color:#0052d9;text-align:center;font-size:32px;line-height:62px;font-weight:900;">${colors.icon}</div>
      </td>
    `;

  return `
    <div style="margin:0;padding:24px;background:#edf6ff;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:820px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #d8e8fb;border-radius:8px;overflow:hidden;box-shadow:0 18px 42px rgba(0,44,110,0.16);">
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#163A9D" style="background:#163A9D;background:linear-gradient(135deg,#163A9D 0%,#0052d9 58%,#0b73ff 100%);">
              <tr>
                <td style="padding:26px 34px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="width:76px;vertical-align:middle;">
                        ${logoHtml}
                      </td>
                      <td style="padding-left:14px;border-left:1px solid rgba(255,255,255,0.5);vertical-align:middle;">
                        <div style="color:#ffffff;font-size:16px;font-weight:800;line-height:1.2;">Schools Division of Baguio City</div>
                        <div style="margin-top:4px;color:#ffffff;font-size:28px;font-weight:950;letter-spacing:0;line-height:1;">SMME Platform</div>
                        <div style="margin-top:7px;color:#dfeaff;font-size:14px;line-height:1.2;">Supporting Schools. Strengthening Education.</div>
                      </td>
                      <td style="text-align:right;vertical-align:middle;">
                        ${headerBadgeHtml}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 42px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                ${titleIconHtml}
                <td style="vertical-align:middle;">
                  <h1 style="margin:0;color:#071c57;font-size:34px;line-height:1.05;font-weight:950;">${escapeHtml(title)}</h1>
                  <div style="width:80px;height:3px;margin-top:12px;background:#0052d9;border-radius:999px;"></div>
                </td>
              </tr>
            </table>
            <div style="margin-top:18px;">
              <p style="margin:0 0 12px;color:#151b2d;font-size:16px;line-height:1.55;">${escapeHtml(greeting)}</p>
              ${introHtml}
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;border:1px solid #afcff7;border-radius:8px;background:#f9fcff;border-collapse:separate;border-spacing:0;overflow:hidden;">
              ${renderDetailRows(details)}
            </table>
            ${renderFileList(fileNames)}
            ${actionHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 42px;background:#f3f8ff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:42px;">
                  <div style="width:30px;height:30px;border:2px solid #0052d9;border-radius:50%;color:#0052d9;text-align:center;font-size:18px;line-height:28px;font-weight:900;">i</div>
                </td>
                <td style="color:#4d5c78;font-size:14px;line-height:1.45;">This is an automated notification from the SDO Baguio SMME Platform.</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 42px;border-top:1px solid #9fc5f6;background:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="color:#0047c2;font-size:14px;font-weight:900;">SDO Baguio SMME Platform<br><span style="color:#5c6c88;font-size:12px;font-weight:500;">Digital Solutions. Better Schools.</span></td>
                <td style="text-align:right;color:#0047c2;font-size:13px;">Help Center&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;Privacy Policy&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;Contact Us</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
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
