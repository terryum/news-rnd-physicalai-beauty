import nodemailer from "nodemailer";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

export function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required",
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendDigest(options: SendOptions): Promise<void> {
  const transport = createTransport();
  const from = `Physical AI Radar <${process.env.GMAIL_USER}>`;

  const info = await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  console.log(`Email sent: ${info.messageId}`);
}
