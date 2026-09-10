import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config/index.js";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mode: "resend" | "smtp" | "simulated";
  error?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = config.smtp.host;
  const port = config.smtp.port;

  if (!host) {
    return null;
  }

  const hasAuth = Boolean(config.smtp.user && config.smtp.pass);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: config.smtp.secure || port === 465,
    auth: hasAuth
      ? {
          user: config.smtp.user,
          pass: config.smtp.pass,
        }
      : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

async function sendViaResend(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const payload = {
    from: config.emailFrom,
    to: [options.toName ? `"${options.toName}" <${options.to}>` : options.to],
    subject: options.subject,
    html: options.html,
    text: options.text || options.subject,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    const errorMsg =
      data.message || data.error || `Resend error status ${res.status}`;
    console.error(`[EmailService] Resend delivery failed:`, errorMsg);
    return {
      success: false,
      mode: "resend",
      error: errorMsg,
    };
  }

  return {
    success: true,
    mode: "resend",
    messageId: data.id || `resend-${Date.now()}`,
  };
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  if (config.mailDriver === "resend" && config.resendApiKey) {
    try {
      return await sendViaResend(options);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailService] Resend request error:`, errorMsg);
      return {
        success: false,
        mode: "resend",
        error: errorMsg,
      };
    }
  }

  const mailTransport = getTransporter();

  if (!mailTransport) {
    return {
      success: true,
      mode: "simulated",
      messageId: `simulated-${Date.now()}`,
    };
  }

  try {
    const info = await mailTransport.sendMail({
      from: config.emailFrom,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    });

    return {
      success: true,
      mode: "smtp",
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[EmailService] SMTP delivery failed to ${options.to}:`,
      errorMsg,
    );
    if (!config.smtp.user) {
      return {
        success: true,
        mode: "simulated",
        messageId: `simulated-${Date.now()}`,
      };
    }
    return {
      success: false,
      mode: "smtp",
      error: errorMsg,
    };
  }
}
