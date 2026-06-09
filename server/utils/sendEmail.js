import { BrevoClient } from '@getbrevo/brevo';

const sendEmail = async (options) => {
  // Initialize Brevo with the API key from environment variables
  const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
  });

  // Since you verified 0xspectre.tech, you can send from any address at that domain.
  // We will default to support@0xspectre.tech if EMAIL_USER is not set.
  const fromEmail = process.env.EMAIL_USER || 'support@0xspectre.tech';

  try {
    const data = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: 'Spectre IIT-Bhilai',
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

    return data;
  } catch (error) {
    throw new Error(error.message || 'Error sending email via Brevo');
  }
};

export default sendEmail;
