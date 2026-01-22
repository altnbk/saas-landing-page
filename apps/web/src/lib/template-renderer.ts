/**
 * Template renderer with XSS protection
 * Safely replaces placeholders in templates with HTML-escaped user data
 */

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Replace template placeholders with escaped user data
 */
export function renderTemplate(
  template: string,
  data: {
    organizationName: string;
    signerName: string;
    signerEmail: string;
  }
): string {
  // Escape all user inputs to prevent XSS
  const escapedData = {
    organizationName: escapeHtml(data.organizationName),
    signerName: escapeHtml(data.signerName),
    signerEmail: escapeHtml(data.signerEmail),
  };

  // Replace placeholders (case-insensitive)
  let rendered = template;
  rendered = rendered.replace(/\{\{ORGANIZATION_NAME\}\}/g, escapedData.organizationName);
  rendered = rendered.replace(/\{\{SIGNER_NAME\}\}/g, escapedData.signerName);
  rendered = rendered.replace(/\{\{SIGNER_EMAIL\}\}/g, escapedData.signerEmail);

  return rendered;
}

/**
 * Generate a safe repository name from organization name
 * - Converts to lowercase
 * - Replaces spaces and special chars with hyphens
 * - Removes consecutive hyphens
 * - Adds timestamp to ensure uniqueness
 */
export function generateRepoName(organizationName: string): string {
  const timestamp = Date.now();
  const safeName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .substring(0, 50); // Limit length

  return `landing-${safeName}-${timestamp}`;
}
