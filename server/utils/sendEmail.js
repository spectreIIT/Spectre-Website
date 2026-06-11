import { BrevoClient } from '@getbrevo/brevo';
import { Resend } from 'resend';

const sendEmail = async (options) => {
  const fromEmail = process.env.EMAIL_USER || 'support@0xspectre.tech';
  const fromName = 'Spectre IIT-Bhilai';
  
  // Try Brevo first
  if (process.env.BREVO_API_KEY) {
    try {
      const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
      });

      const data = await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            email: options.email,
          },
        ],
        subject: options.subject,
        htmlContent: options.html || options.message, // Support both HTML and plain text
      });

      console.log('Email sent successfully via Brevo');
      return data;
    } catch (brevoError) {
      console.warn('Brevo failed or limit reached. Falling back to Resend...', brevoError.message);
      // Let it fall through to Resend logic
    }
  } else {
    console.warn('BREVO_API_KEY not set. Skipping Brevo...');
  }

  // Fallback to Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [options.email],
        subject: options.subject,
        html: options.html || options.message,
      });

      if (error) {
        console.error('Resend API error:', error.message);
        throw new Error('There was a problem sending the email. Please try again later.');
      }

      console.log('Email sent successfully via Resend');
      return data;
    } catch (resendError) {
      console.error('Resend fallback failed:', resendError.message);
      throw new Error('There was a problem sending the email. Please try again later.');
    }
  }

  console.error('No valid email service API keys provided (BREVO_API_KEY or RESEND_API_KEY).');
  throw new Error('There was a problem sending the email. Please try again later.');
};

export default sendEmail;
