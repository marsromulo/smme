import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSmmeEmailTemplate,
  getPlatformUrl,
  sendSendGridEmail,
} from "@/lib/sendgrid";

const genericMessage =
  "If an account exists for that email address, a password reset link has been sent.";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email?: unknown }).email
      : null;

  if (!isEmail(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      email: normalizedEmail,
      type: "recovery",
    });

    if (error || !data.properties.hashed_token) {
      console.warn("Password recovery link was not generated:", error?.message ?? "No token returned.");
      return Response.json({ message: genericMessage });
    }

    const resetUrl = new URL("/platform/reset-password", getPlatformUrl());
    resetUrl.searchParams.set("token_hash", data.properties.hashed_token);
    resetUrl.searchParams.set("type", "recovery");

    const html = buildSmmeEmailTemplate({
      action: {
        href: resetUrl.toString(),
        label: "Reset Password",
      },
      details: [
        { label: "Email", value: normalizedEmail },
        { label: "Status", value: "Password reset requested" },
      ],
      greeting: "Hello,",
      intro: [
        "We received a request to reset the password for your SMME Platform account.",
        "Use the button below to choose a new password. If you did not request this, you can safely ignore this email.",
      ],
      status: "info",
      statusLabel: "Security",
      title: "Reset Your Password",
    });
    const text = [
      "We received a request to reset your SMME Platform password.",
      "",
      `Reset your password: ${resetUrl.toString()}`,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n");
    const sendResult = await sendSendGridEmail({
      html,
      subject: "Reset your SMME Platform password",
      text,
      to: { email: normalizedEmail },
    });

    if (!sendResult.sent) {
      console.error("Password recovery email was not sent:", sendResult.reason);
      return Response.json(
        { error: "Unable to send the reset email right now. Please try again later." },
        { status: 503 },
      );
    }

    return Response.json({ message: genericMessage });
  } catch (error) {
    console.error(
      "Password recovery request failed:",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { error: "Unable to send the reset email right now. Please try again later." },
      { status: 500 },
    );
  }
}
