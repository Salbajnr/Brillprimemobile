import nodemailer from 'nodemailer';
import validator from 'validator';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private isInitialized = false;
  private initializationPromise: Promise<void>;

  constructor() {
    this.initializationPromise = this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Check for production email configuration first
      if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // Use app password for Gmail
          }
        });
        console.log('Gmail transporter initialized');
      } else if (process.env.SENDGRID_API_KEY) {
        // SendGrid configuration
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
        console.log('SendGrid transporter initialized');
      } else if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Custom SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('Custom SMTP transporter initialized');
        
        // For custom SMTP, verify connection with timeout
        try {
          const verifyPromise = this.transporter.verify();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Verification timeout')), 5000)
          );
          
          await Promise.race([verifyPromise, timeoutPromise]);
          console.log('✅ Custom SMTP connection verified successfully');
        } catch (verifyError: any) {
          console.warn('⚠️ SMTP connection verification failed, but transporter created. Will attempt to send emails:', verifyError.message);
          // Continue without verification since some SMTP servers don't support verify()
        }
        this.isInitialized = true;
        return;
      } else {
        // Fallback to Ethereal for development
        await this.createTestAccount();
        return;
      }

      // Verify connection for Gmail and SendGrid
      await this.verifyConnection();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      await this.createTestAccount();
    }
  }

  private async createTestAccount() {
    try {
      console.log('Creating test email account for development...');
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✅ Test email account created:', testAccount.user);
      console.log('📧 Email preview will be available at: https://ethereal.email');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to create test email account:', error);
      // Create a minimal transporter for testing
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
      this.isInitialized = true;
    }
  }

  isValidEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  async sendOTP(email: string, otpCode: string, userName?: string): Promise<boolean> {
    try {
      // Wait for initialization to complete with timeout
      try {
        await Promise.race([
          this.initializationPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 10000))
        ]);
      } catch (initError) {
        console.warn('Email service initialization still pending, proceeding with caution:', initError.message);
      }
      
      if (!this.transporter) {
        throw new Error('Email transporter not available.');
      }
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Brill Prime <noreply@brillprime.com>',
        to: email,
        subject: 'Your Brill Prime Verification Code',
        html: this.generateOTPEmailTemplate(otpCode, userName)
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log the preview URL for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return true;
    } catch (error: any) {
      console.error('Failed to send OTP email:', error.message);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName?: string): Promise<boolean> {
    try {
      // Wait for initialization to complete
      await this.initializationPromise;
      
      if (!this.isInitialized) {
        throw new Error('Email service not initialized.');
      }
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email address format');
      }

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Brill Prime <noreply@brillprime.com>',
        to: email,
        subject: 'Reset Your Brill Prime Password',
        html: this.generatePasswordResetTemplate(resetUrl, userName)
      };

      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset email sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return true;
    } catch (error: any) {
      console.error('Failed to send password reset email:', error.message);
      return false;
    }
  }

  private generateOTPEmailTemplate(otpCode: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Brill Prime Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #8B5CF6; font-size: 24px; font-weight: bold; }
          .otp-box {
            background: #f8f9fa;
            border: 2px solid #8B5CF6;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #8B5CF6;
            letter-spacing: 5px;
            margin: 10px 0;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 Brill Prime</div>
            <h2>Email Verification</h2>
          </div>

          <p>Hello ${userName || 'there'},</p>

          <p>Thank you for signing up with Brill Prime! To complete your registration, please enter the verification code below:</p>

          <div class="otp-box">
            <p>Your verification code is:</p>
            <div class="otp-code">${otpCode}</div>
            <p><small>This code will expire in 10 minutes</small></p>
          </div>

          <p>If you didn't request this verification code, please ignore this email.</p>

          <div class="footer">
            <p>© 2024 Brill Prime. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(resetUrl: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Brill Prime Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #8B5CF6; font-size: 24px; font-weight: bold; }
          .button {
            display: inline-block;
            background: #8B5CF6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 Brill Prime</div>
            <h2>Password Reset Request</h2>
          </div>

          <p>Hello ${userName || 'there'},</p>

          <p>We received a request to reset your Brill Prime account password. Click the button below to reset your password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #8B5CF6;">${resetUrl}</p>

          <p>This link will expire in 1 hour for security reasons.</p>

          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>

          <div class="footer">
            <p>© 2024 Brill Prime. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    // Wait for initialization to complete
    await this.initializationPromise;
    
    if (!this.transporter) {
      console.error('Email transporter not available for verification.');
      return false;
    }
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error: any) {
      console.error('Email service connection failed:', error.message);
      return false;
    }
  }
}

export const emailService = new EmailService();