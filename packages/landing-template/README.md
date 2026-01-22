# Landing Page Template

This package contains the HTML template used to generate landing pages for clients.

## Template Placeholders

The template uses the following placeholders that are replaced with user data:

- `{{ORGANIZATION_NAME}}` - The organization or individual name
- `{{SIGNER_NAME}}` - The contact person's name
- `{{SIGNER_EMAIL}}` - The contact person's email

## Security

All user data is **HTML-escaped** before being inserted into the template to prevent XSS attacks. See `apps/web/src/lib/template-renderer.ts` for the escaping logic.

## Template Structure

The landing page includes:

1. **Hero Section** - Eye-catching gradient header with organization name and CTA button
2. **Contact Section** - Contact information with signer name and email
3. **Footer** - Copyright notice and branding

## Customization

To customize the template:

1. Edit `index.html` in this directory
2. Add new placeholders using the `{{PLACEHOLDER_NAME}}` format
3. Update the `renderTemplate()` function in `template-renderer.ts` to handle new placeholders
4. Update the TypeScript types if needed

## Deployment

The template is:
1. Read from this file during deployment
2. Rendered with escaped user data
3. Committed to a new GitHub repository
4. Deployed to Cloudflare Pages

## Testing

To test the template locally:

```bash
# Open index.html in a browser
# Manually replace placeholders with test data
```

For automated testing, the template renderer includes XSS protection tests.
