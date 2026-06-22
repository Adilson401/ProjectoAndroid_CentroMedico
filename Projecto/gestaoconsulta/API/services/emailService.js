import nodemailer from 'nodemailer';

export class EmailService {
  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.enabled = Boolean(host && user && pass);

    if (!this.enabled) {
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendMail({ to, subject, text, html }) {
    if (!this.enabled) {
      throw new Error(
        'SMTP não configurado. Configure SMTP_HOST, SMTP_USER e SMTP_PASS.'
      );
    }

    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const replyTo = process.env.EMAIL_REPLY_TO || process.env.SMTP_USER;
    const envelope = {
      from: process.env.SMTP_USER,
      to,
    };

    await this.transporter.verify();

    const info = await this.transporter.sendMail({
      from,
      to,
      replyTo,
      envelope,
      subject,
      text,
      html,
    });

    if (info.rejected && info.rejected.length > 0) {
      throw new Error(
        `Email rejeitado pelo servidor SMTP: ${info.rejected.join(', ')}`
      );
    }

    return info;
  }
}
