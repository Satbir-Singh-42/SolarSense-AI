import nodemailer from 'nodemailer';
import type { User, EnergyTrade, Household } from '../shared/schema';

interface EmailNotificationData {
  offerCreator: User;
  acceptor: User;
  trade: EnergyTrade;
  household: Household;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Enhanced SMTP configuration with timeout and security settings
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
        },
        tls: {
          rejectUnauthorized: true
        },
        connectionTimeout: 10000, // 10 seconds timeout
        socketTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 5000, // 5 seconds timeout
      });

      // Verify the connection with timeout
      if (this.transporter) {
        const verifyPromise = this.transporter.verify();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection verification timeout')), 15000);
        });
        
        await Promise.race([verifyPromise, timeoutPromise]);
        console.log('📧 Email service initialized successfully');
      }
    } catch (error) {
      console.warn('⚠️ Email service initialization failed:', error);
      console.warn('📧 Email notifications will be disabled but application will continue normally');
      // Gracefully handle email service failure - app continues without email
      this.transporter = null;
    }
  }

  async sendTradeAcceptanceNotification(data: EmailNotificationData): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const { offerCreator, acceptor, trade, household } = data;
      
      const subject = `✅ Your Energy Trade Offer Has Been Accepted! - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🌞 SolarSense Energy Trading</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sustainable Energy Trading Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #10b981; margin-top: 0;">Great News! Your Energy Offer Has Been Accepted 🎉</h2>
            
            <p>Hello <strong>${offerCreator.username}</strong>,</p>
            
            <p>Someone has accepted your energy trade offer! Here are the details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #374151;">📊 Trade Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Energy Amount:</strong> ${trade.energyAmount} kWh</li>
                <li style="margin: 8px 0;"><strong>Price per kWh:</strong> ₹${trade.pricePerKwh}</li>
                <li style="margin: 8px 0;"><strong>Total Value:</strong> ₹${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}</li>
                <li style="margin: 8px 0;"><strong>Trade Type:</strong> ${trade.tradeType === 'sell' ? '🔋 Selling Energy' : '⚡ Buying Energy'}</li>
              </ul>
            </div>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">👤 Accepted By</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Username:</strong> ${acceptor.username}</li>
                <li style="margin: 8px 0;"><strong>Household:</strong> ${household.name}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${acceptor.district}, ${acceptor.state}</li>
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #374151;">🔄 Next Steps</h3>
              <ol style="color: #374151; line-height: 1.6;">
                <li>Log into your SolarSense dashboard to view full contact details</li>
                <li>Coordinate with the other party for energy delivery/pickup</li>
                <li>Confirm the energy transfer once completed</li>
                <li>Rate your trading experience</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${'https://solarsense-ai.onrender.com/'}" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 View Dashboard
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              🌍 SolarSense - Building a sustainable energy future together<br>
              Decentralized • Resilient • Equitable
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: offerCreator.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Trade acceptance notification sent to ${offerCreator.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send trade acceptance notification:', error);
      return false;
    }
  }

  async sendContactSharingNotification(
    recipient: User, 
    sender: User, 
    trade: EnergyTrade
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `📞 Contact Details Shared - Energy Trade #${trade.id} - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📞 Contact Information Shared</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Energy Trade #${trade.id}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #3b82f6; margin-top: 0;">Contact Details Available 📱</h2>
            
            <p>Hello <strong>${recipient.username}</strong>,</p>
            
            <p>Contact information has been shared for your energy trade. You can now coordinate directly with:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #374151;">👤 Contact Information</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Name:</strong> ${sender.username}</li>
                <li style="margin: 8px 0;"><strong>Email:</strong> ${sender.email}</li>
                <li style="margin: 8px 0;"><strong>Phone:</strong> ${sender.phone || 'Not provided'}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${sender.district}, ${sender.state}</li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Please reach out to coordinate the energy transfer details, timing, and any technical requirements.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${'https://solarsense-ai.onrender.com/'}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 View Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Contact sharing notification sent to ${recipient.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send contact sharing notification:', error);
      return false;
    }
  }

  async sendTradeCancellationNotification(
    recipient: User,
    trade: EnergyTrade,
    creatorName: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `❌ Energy Trade Cancelled - Trade #${trade.id} - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">❌ Trade Cancelled</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Energy Trade #${trade.id}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #ef4444; margin-top: 0;">Trade No Longer Available 🚫</h2>
            
            <p>Hello <strong>${recipient.username}</strong>,</p>
            
            <p>Unfortunately, the energy trade you applied to has been cancelled by the offer creator.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="margin-top: 0; color: #374151;">📊 Cancelled Trade Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Energy Amount:</strong> ${trade.energyAmount} kWh</li>
                <li style="margin: 8px 0;"><strong>Price per kWh:</strong> ₹${trade.pricePerKwh}</li>
                <li style="margin: 8px 0;"><strong>Total Value:</strong> ₹${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}</li>
                <li style="margin: 8px 0;"><strong>Trade Type:</strong> ${trade.tradeType === 'sell' ? '🔋 Selling Energy' : '⚡ Buying Energy'}</li>
                <li style="margin: 8px 0;"><strong>Cancelled By:</strong> ${creatorName}</li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              We apologize for any inconvenience. Please check the marketplace for other available energy trading opportunities.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://solarsense-ai.onrender.com/" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🔍 Browse Available Trades
              </a>
            </div>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Trade cancellation notification sent to ${recipient.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send trade cancellation notification:', error);
      return false;
    }
  }

  async sendApplicationCancellationNotification(
    offerCreator: User,
    applicant: User, 
    trade: EnergyTrade
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `📤 Application Withdrawn - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📤 Application Withdrawn</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Energy Trade Application</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #f59e0b; margin-top: 0;">Application Cancelled 📋</h2>
            
            <p>Hello <strong>${offerCreator.username}</strong>,</p>
            
            <p>A potential trading partner has withdrawn their application for your energy trade.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #374151;">👤 Withdrawn Application</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Applicant:</strong> ${applicant.username}</li>
                <li style="margin: 8px 0;"><strong>Location:</strong> ${applicant.district}, ${applicant.state}</li>
                <li style="margin: 8px 0;"><strong>Trade:</strong> ${trade.energyAmount} kWh at ₹${trade.pricePerKwh}/kWh</li>
                <li style="margin: 8px 0;"><strong>Status:</strong> Application Cancelled</li>
              </ul>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Your trade is still active and available for other interested parties to apply.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://solarsense-ai.onrender.com/" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 View Trade Applications
              </a>
            </div>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: offerCreator.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Application cancellation notification sent to ${offerCreator.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send application cancellation notification:', error);
      return false;
    }
  }

  async sendApplicationApprovalNotification(
    applicant: User,
    tradeOwner: User,
    trade: EnergyTrade,
    household?: Household
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `🎉 Your Energy Trade Application Approved! - SolarSense`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🌞 SolarSense Energy Trading</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Application Approved!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #10b981; margin-top: 0;">Great News! Your Application Has Been Approved ✅</h2>
            
            <p>Hello <strong>${applicant.username}</strong>,</p>
            
            <p>Excellent news! <strong>${tradeOwner.username}</strong> has approved your energy trade application. Here are the trade details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #374151;">📊 Approved Trade Details</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="margin: 8px 0;"><strong>Energy Amount:</strong> ${trade.energyAmount} kWh</li>
                <li style="margin: 8px 0;"><strong>Price per kWh:</strong> ₹${trade.pricePerKwh}</li>
                <li style="margin: 8px 0;"><strong>Total Value:</strong> ₹${(trade.energyAmount * trade.pricePerKwh).toFixed(2)}</li>
                <li style="margin: 8px 0;"><strong>Trade Type:</strong> ${trade.tradeType === 'sell' ? '🔋 Energy Sale' : '⚡ Energy Purchase'}</li>
                ${household ? `<li style="margin: 8px 0;"><strong>Household:</strong> ${household.name}</li>` : ''}
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">📞 Next Steps</h4>
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                To proceed with this trade, you need to <strong>share your contact details</strong> so both parties can coordinate the energy transfer. 
                You can do this from your dashboard.
              </p>
            </div>
            
            <p style="color: #374151; line-height: 1.6;">
              Once you share your contact information, both you and ${tradeOwner.username} will be able to coordinate the technical details, 
              timing, and logistics of the energy transfer.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/storage" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📱 Share Contact Details
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This email was sent automatically by SolarSense. If you have questions, please contact us through the platform.
              </p>
            </div>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: applicant.email,
        subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Application approval notification sent to ${applicant.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to send application approval notification:', error);
      return false;
    }
  }

  // Test email functionality
  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email service not available');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject: '🔧 SolarSense Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #10b981;">✅ Email Service Working!</h2>
            <p>This is a test email from your SolarSense application.</p>
            <p>Email notifications are now properly configured.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Test email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send test email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();