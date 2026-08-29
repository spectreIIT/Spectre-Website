import { BrevoClient } from '@getbrevo/brevo';
import { Resend } from 'resend';

export const generateNotificationEmailHtml = (title, message) => {
  const formattedMessage = (message || '')
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">${p}</p>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #12141a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <span style="display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #00f0ff; text-transform: uppercase;">SPECTRE <span style="color: #ec4899;">CTF</span></span>
                        <div style="font-size: 12px; color: #94a3b8; margin-top: 2px; letter-spacing: 0.5px;">IIT Bhilai Cybersecurity Platform</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 20px; font-weight: 700; border-left: 3px solid #ec4899; padding-left: 12px;">${title}</h2>
                  <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    ${formattedMessage}
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #64748b;">
                    You received this email because you are a registered user of Spectre CTF.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color: #0d0f14; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    &copy; ${new Date().getFullYear()} Spectre • IIT Bhilai • All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendEmail = async (options) => {
  // Use a consistent sender across both platforms
  const fromEmail = process.env.EMAIL_USER || 'admin@0xspectre.tech';
  const fromName = 'Spectre IIT-Bhilai';
  const htmlContent = options.html || (options.title && options.message ? generateNotificationEmailHtml(options.title, options.message) : (options.message || ''));
  
  let resendErr = null;
  let brevoErr = null;

  // 1. Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [options.email],
        subject: options.subject,
        html: htmlContent,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
      }

      console.log(`Email sent successfully via Resend to ${options.email}`);
      return { success: true, service: 'Resend', data };
    } catch (resendError) {
      resendErr = resendError;
      console.warn(`Resend failed for ${options.email} (${resendError.message}). Falling back to Brevo...`);
    }
  } else {
    resendErr = new Error('RESEND_API_KEY not configured');
  }

  // 2. Fallback to Brevo
  if (process.env.BREVO_API_KEY) {
    try {
      const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
      });

      // Check account limits if available
      try {
        const accountData = await brevo.account.getAccount();
        const sendLimitPlan = accountData?.plan?.find(p => p.creditsType === 'sendLimit');
        if (sendLimitPlan && sendLimitPlan.credits <= 0) {
          throw new Error('Brevo daily credit limit reached (0 credits available).');
        }
      } catch (limitErr) {
        if (limitErr.message && limitErr.message.includes('limit reached')) {
          throw limitErr;
        }
        // Non-fatal if account check fails, continue attempting send
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
        htmlContent: htmlContent,
      });

      console.log(`Email sent successfully via Brevo to ${options.email}`);
      return { success: true, service: 'Brevo', data };
    } catch (brevoError) {
      brevoErr = brevoError;
      console.error(`Brevo failed for ${options.email}:`, brevoError.message);
    }
  } else {
    brevoErr = new Error('BREVO_API_KEY not configured');
  }

  // Both failed
  const errorDetails = `Resend error: [${resendErr?.message || 'N/A'}] | Brevo error: [${brevoErr?.message || 'N/A'}]`;
  console.error(`Failed to send email to ${options.email}: ${errorDetails}`);
  throw new Error(`Email delivery failed to ${options.email}. Details: ${errorDetails}`);
};

export default sendEmail;

