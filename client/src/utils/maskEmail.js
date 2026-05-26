export const maskEmail = (email) => {
  if (!email) return '—';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  if (name.length <= 3) return `***@${domain}`;
  return `${name.substring(0, 3)}***@${domain}`;
};
