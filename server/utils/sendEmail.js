import { Resend } from 'resend';

const sendEmail = async (options) => {
  // Initialize Resend with the API key from environment variables
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Since you verified 0xspectre.tech, you can send from any address at that domain.
  // We will default to support@0xspectre.tech if EMAIL_USER is not set.
  const fromEmail = process.env.EMAIL_USER || 'support@0xspectre.tech';

  const { data, error } = await resend.emails.send({
    from: `Spectre CTF <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message, // Support both HTML and plain text
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export default sendEmail;
