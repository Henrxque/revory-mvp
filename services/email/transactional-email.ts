import "server-only";

type PasswordResetEmailInput = Readonly<{
  email: string;
  resetUrl: string;
}>;

export function getTransactionalEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.AUTH_EMAIL_FROM?.trim() ?? "";

  return {
    apiKey,
    configured: Boolean(apiKey && from),
    from,
  };
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: PasswordResetEmailInput) {
  const config = getTransactionalEmailConfig();

  if (!config.configured) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: config.from,
      html: `
        <p>Use this secure link to reset your REVORY password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires shortly. If you did not request it, ignore this email.</p>
      `,
      subject: "Reset your REVORY password",
      text: `Reset your REVORY password: ${resetUrl}`,
      to: email,
    }),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    console.error("[revory-email] password reset email failed", {
      status: response.status,
      text: await response.text(),
    });

    return false;
  }

  return true;
}
