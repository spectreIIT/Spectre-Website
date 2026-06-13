import { BrevoClient } from '@getbrevo/brevo';
import { Resend } from 'resend';

const sendEmail = async (options) => {
  // Use a consistent sender across both platforms
  const fromEmail = process.env.EMAIL_USER || 'admin@0xspectre.tech';
  const fromName = 'Spectre IIT-Bhilai';
  
  // Try Resend first
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
        // Resend API returns errors here (e.g., limit reached, unauthorized)
        throw new Error(`Resend API error: ${error.message}`);
      }

      console.log(`Email sent successfully via Resend to ${options.email}`);
      return data;
    } catch (resendError) {
      console.warn('Resend failed or limit reached. Falling back to Brevo...', resendError.message);
    }
  } else {
    console.warn('RESEND_API_KEY not set. Skipping Resend...');
  }

  // Fallback to Brevo
  if (process.env.BREVO_API_KEY) {
    try {
      const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
      });

      // Check account limits before sending, as Brevo silently queues if limit is reached
      const accountData = await brevo.account.getAccount();
      const sendLimitPlan = accountData.plan.find(p => p.creditsType === 'sendLimit');
      if (sendLimitPlan && sendLimitPlan.credits <= 0) {
        throw new Error('Brevo daily limit reached (0 credits available).');
      }

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
        htmlContent: options.html || options.message,
      });

      console.log(`Email sent successfully via Brevo to ${options.email}`);
      return data;
    } catch (brevoError) {
      console.error('Brevo fallback failed:', brevoError.message);
      throw new Error('There was a problem sending the email. Please try again later.');
    }
  }

  console.error('No valid email service API keys provided (BREVO_API_KEY or RESEND_API_KEY).');
  throw new Error('There was a problem sending the email. Please try again later.');
};

export default sendEmail;
