import nodemailer from 'nodemailer';
import type { User, EnergyTrade, Household } from '../shared/schema';

interface EmailNotificationData {
  offerCreator: User;
  acceptor: User;
  trade: EnergyTrade;
  household: Household;
}

// -- Shared template helpers --------------------------------------------------

const APP_URL = () => process.env.CLIENT_URL || 'http://localhost:5000';

function emailShell(headerBg: string, title: string, subtitle: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <div style="background:linear-gradient(135deg,${headerBg});color:#fff;padding:20px;border-radius:8px 8px 0 0">
      <h1 style="margin:0;font-size:24px">${title}</h1>
      <p style="margin:5px 0 0;opacity:.9">${subtitle}</p>
    </div>
    <div style="background:#f8fafc;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">${body}</div>
  </div>`;
}

function infoBox(borderColor: string, heading: string, items: string[]): string {
  const lis = items.map(i => `<li style="margin:8px 0">${i}</li>`).join('');
  return `<div style="background:#fff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid ${borderColor}">
    <h3 style="margin-top:0;color:#374151">${heading}</h3>
    <ul style="list-style:none;padding:0">${lis}</ul>
  </div>`;
}

function ctaButton(text: string, color: string, path = ''): string {
  return `<div style="text-align:center;margin:30px 0">
    <a href="${APP_URL()}${path}" style="background:${color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">${text}</a>
  </div>`;
}

function tradeDetailItems(trade: EnergyTrade): string[] {
  return [
    `<strong>Energy Amount:</strong> ${trade.energyAmount} kWh`,
    `<strong>Price per kWh:</strong> ₹${trade.pricePerKwh}`,
    `<strong>Total Value:</strong> ₹${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}`,
    `<strong>Trade Type:</strong> ${trade.tradeType === 'sell' ? '🔋 Selling Energy' : '⚡ Buying Energy'}`,
  ];
}

const EMAIL_FOOTER = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0">
  <p style="color:#6b7280;font-size:14px;text-align:center">
    🌍 SolarSense - Building a sustainable energy future together<br>Decentralized • Resilient • Equitable
  </p>`;

// -- Email Service ------------------------------------------------------------

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
        tls: { rejectUnauthorized: true },
        connectionTimeout: 10_000,
        socketTimeout: 10_000,
        greetingTimeout: 5_000,
      });

      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 15_000)),
      ]);
      console.log('📧 Email service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  /** Central send – guards on transporter availability */
  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }
    try {
      await this.transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
      console.log(`📧 Notification sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // -- Notifications ----------------------------------------------------------

  async sendTradeAcceptanceNotification(data: EmailNotificationData): Promise<boolean> {
    const { offerCreator, acceptor, trade, household } = data;

    const body = `
      <h2 style="color:#10b981;margin-top:0">Great News! Your Energy Offer Has Been Accepted 🎉</h2>
      <p>Hello <strong>${offerCreator.username}</strong>,</p>
      <p>Someone has accepted your energy trade offer! Here are the details:</p>
      ${infoBox('#10b981', '📊 Trade Details', tradeDetailItems(trade))}
      ${infoBox('#3b82f6', '👤 Accepted By', [
        `<strong>Username:</strong> ${acceptor.username}`,
        `<strong>Household:</strong> ${household.name}`,
        `<strong>Location:</strong> ${acceptor.district}, ${acceptor.state}`,
      ])}
      <div style="background:#fef3c7;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b">
        <h3 style="margin-top:0;color:#374151">🔄 Next Steps</h3>
        <ol style="color:#374151;line-height:1.6">
          <li>Log into your SolarSense dashboard to view full contact details</li>
          <li>Coordinate with the other party for energy delivery/pickup</li>
          <li>Confirm the energy transfer once completed</li>
          <li>Rate your trading experience</li>
        </ol>
      </div>
      ${ctaButton('📱 View Dashboard', '#10b981')}
      ${EMAIL_FOOTER}`;

    return this.send(
      offerCreator.email,
      '✅ Your Energy Trade Offer Has Been Accepted! - SolarSense',
      emailShell('#10b981,#059669', '🌞 SolarSense Energy Trading', 'Sustainable Energy Trading Platform', body),
    );
  }

  async sendContactSharingNotification(recipient: User, sender: User, trade: EnergyTrade): Promise<boolean> {
    const body = `
      <h2 style="color:#3b82f6;margin-top:0">Contact Details Available 📱</h2>
      <p>Hello <strong>${recipient.username}</strong>,</p>
      <p>Contact information has been shared for your energy trade. You can now coordinate directly with:</p>
      ${infoBox('#3b82f6', '👤 Contact Information', [
        `<strong>Name:</strong> ${sender.username}`,
        `<strong>Email:</strong> ${sender.email}`,
        `<strong>Phone:</strong> ${sender.phone || 'Not provided'}`,
        `<strong>Location:</strong> ${sender.district}, ${sender.state}`,
      ])}
      <p style="color:#374151;line-height:1.6">Please reach out to coordinate the energy transfer details, timing, and any technical requirements.</p>
      ${ctaButton('📱 View Dashboard', '#3b82f6')}`;

    return this.send(
      recipient.email,
      `📞 Contact Details Shared - Energy Trade #${trade.id} - SolarSense`,
      emailShell('#3b82f6,#2563eb', '📞 Contact Information Shared', `Energy Trade #${trade.id}`, body),
    );
  }

  async sendTradeCancellationNotification(recipient: User, trade: EnergyTrade, creatorName: string): Promise<boolean> {
    const body = `
      <h2 style="color:#ef4444;margin-top:0">Trade No Longer Available 🚫</h2>
      <p>Hello <strong>${recipient.username}</strong>,</p>
      <p>Unfortunately, the energy trade you applied to has been cancelled by the offer creator.</p>
      ${infoBox('#ef4444', '📊 Cancelled Trade Details', [
        ...tradeDetailItems(trade),
        `<strong>Cancelled By:</strong> ${creatorName}`,
      ])}
      <p style="color:#374151;line-height:1.6">We apologize for any inconvenience. Please check the marketplace for other available energy trading opportunities.</p>
      ${ctaButton('🔍 Browse Available Trades', '#10b981')}`;

    return this.send(
      recipient.email,
      `❌ Energy Trade Cancelled - Trade #${trade.id} - SolarSense`,
      emailShell('#ef4444,#dc2626', '❌ Trade Cancelled', `Energy Trade #${trade.id}`, body),
    );
  }

  async sendApplicationCancellationNotification(offerCreator: User, applicant: User, trade: EnergyTrade): Promise<boolean> {
    const body = `
      <h2 style="color:#f59e0b;margin-top:0">Application Cancelled 📋</h2>
      <p>Hello <strong>${offerCreator.username}</strong>,</p>
      <p>A potential trading partner has withdrawn their application for your energy trade.</p>
      ${infoBox('#f59e0b', '👤 Withdrawn Application', [
        `<strong>Applicant:</strong> ${applicant.username}`,
        `<strong>Location:</strong> ${applicant.district}, ${applicant.state}`,
        `<strong>Trade:</strong> ${trade.energyAmount} kWh at ₹${trade.pricePerKwh}/kWh`,
        `<strong>Status:</strong> Application Cancelled`,
      ])}
      <p style="color:#374151;line-height:1.6">Your trade is still active and available for other interested parties to apply.</p>
      ${ctaButton('📱 View Trade Applications', '#3b82f6')}`;

    return this.send(
      offerCreator.email,
      '📤 Application Withdrawn - SolarSense',
      emailShell('#f59e0b,#d97706', '📤 Application Withdrawn', 'Energy Trade Application', body),
    );
  }

  async sendApplicationApprovalNotification(
    applicant: User,
    tradeOwner: User,
    trade: EnergyTrade,
    household?: Household,
  ): Promise<boolean> {
    const details = [...tradeDetailItems(trade)];
    if (household) details.push(`<strong>Household:</strong> ${household.name}`);

    const body = `
      <h2 style="color:#10b981;margin-top:0">Great News! Your Application Has Been Approved ✅</h2>
      <p>Hello <strong>${applicant.username}</strong>,</p>
      <p>Excellent news! <strong>${tradeOwner.username}</strong> has approved your energy trade application. Here are the trade details:</p>
      ${infoBox('#10b981', '📊 Approved Trade Details', details)}
      <div style="background:#fef3c7;padding:15px;border-radius:6px;border-left:4px solid #f59e0b;margin:20px 0">
        <h4 style="margin:0 0 10px;color:#92400e">📞 Next Steps</h4>
        <p style="margin:0;color:#92400e;font-size:14px">
          To proceed with this trade, you need to <strong>share your contact details</strong> so both parties can coordinate the energy transfer. You can do this from your dashboard.
        </p>
      </div>
      <p style="color:#374151;line-height:1.6">Once you share your contact information, both you and ${tradeOwner.username} will be able to coordinate the technical details, timing, and logistics of the energy transfer.</p>
      ${ctaButton('📱 Share Contact Details', '#10b981', '/storage')}
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb">
        <p style="color:#6b7280;font-size:12px;margin:0">This email was sent automatically by SolarSense. If you have questions, please contact us through the platform.</p>
      </div>`;

    return this.send(
      applicant.email,
      '🎉 Your Energy Trade Application Approved! - SolarSense',
      emailShell('#10b981,#059669', '🌞 SolarSense Energy Trading', 'Application Approved!', body),
    );
  }

  async sendTestEmail(to: string): Promise<boolean> {
    return this.send(
      to,
      '🔧 SolarSense Email Service Test',
      `<div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#10b981">✅ Email Service Working!</h2>
        <p>This is a test email from your SolarSense application.</p>
        <p>Email notifications are now properly configured.</p>
      </div>`,
    );
  }
}

export const emailService = new EmailService();
