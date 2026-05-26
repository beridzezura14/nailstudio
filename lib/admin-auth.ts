export function getAllowedAdminEmails() {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  const allowedEmails = getAllowedAdminEmails();

  if (!allowedEmails.length) {
    return true;
  }

  return email ? allowedEmails.includes(email.toLowerCase()) : false;
}
