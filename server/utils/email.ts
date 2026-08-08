import { Resend } from "resend";

let resendClient: Resend | null = null;

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendParams): Promise<void> {
  const config = useRuntimeConfig();
  const apiKey = config.resend.apiKey;
  const from = config.resend.fromEmail;

  if (!apiKey) {
    console.warn(
      `[email] NUXT_RESEND_API_KEY is not set — skipping "${subject}" email to ${to}. ` +
        `Configure Resend in .env to send real emails.`,
    );
    return;
  }

  resendClient ??= new Resend(apiKey);
  await resendClient.emails.send({ from, to, subject, html });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate(options: {
  heading: string;
  greeting: string;
  body: string;
  buttonText: string;
  url: string;
  note: string;
}) {
  const safeUrl = escapeHtml(options.url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 40px 24px 40px;border-bottom:1px solid #f4f4f5;">
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.01em;">🧾 Tricker</p>
              <p style="margin:6px 0 0 0;font-size:13px;color:#71717a;">Shared bills, settled simply</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:600;line-height:28px;">${escapeHtml(options.heading)}</h1>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#3f3f46;">${escapeHtml(options.greeting)}</p>
              <p style="margin:0 0 28px 0;font-size:16px;line-height:24px;color:#3f3f46;">${escapeHtml(options.body)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;background-color:#699949;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">${escapeHtml(options.buttonText)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 8px 0;font-size:13px;line-height:20px;color:#71717a;">If the button doesn't work, paste this link into your browser:</p>
              <p style="margin:0;word-break:break-all;font-size:13px;line-height:20px;color:#71717a;">${safeUrl}</p>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:20px;color:#71717a;">${escapeHtml(options.note)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;">© ${new Date().getFullYear()} Tricker</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return `Hi ${trimmed && trimmed.length > 0 ? trimmed : "there"},`;
}

export function sendVerificationEmail(params: {
  to: string;
  name: string | null | undefined;
  url: string;
}): void {
  const { to, name, url } = params;
  void sendEmail({
    to,
    subject: "Verify your Tricker email",
    html: renderTemplate({
      heading: "Verify your email address",
      greeting: greeting(name),
      body: "Welcome to Tricker! Confirm your email so you can invite members to your household and start tracking shared bills.",
      buttonText: "Verify email",
      url,
      note: "This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.",
    }),
  });
}

export function sendPasswordResetEmail(params: {
  to: string;
  name: string | null | undefined;
  url: string;
}): void {
  const { to, name, url } = params;
  void sendEmail({
    to,
    subject: "Reset your Tricker password",
    html: renderTemplate({
      heading: "Reset your password",
      greeting: greeting(name),
      body: "We received a request to reset the password for your Tricker account. Click the button below to choose a new one.",
      buttonText: "Reset password",
      url,
      note: "This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.",
    }),
  });
}
