/**
 * Cloudflare Pages Function: /api/contact
 * =========================================
 * Handles contact form submissions and sends
 * lead notification emails via Resend.
 *
 * SETUP CHECKLIST (complete when Resend account is ready):
 * --------------------------------------------------------
 * 1. Create a free account at https://resend.com
 * 2. Generate an API key in Resend dashboard → API Keys
 * 3. Verify your sending domain (fillandhaul.com) in Resend → Domains
 *    - Add the DNS records Resend provides to GoDaddy
 * 4. In Cloudflare Pages → fill-and-haul-v2 → Settings → Environment Variables:
 *    - Replace the RESEND_API_KEY placeholder value with your real API key
 *    - Set CONTACT_TO_EMAIL to the inbox you want leads sent to
 * 5. Re-deploy (push any commit) to pick up the new secret values
 *
 * HOW IT WORKS:
 * - Form submits JSON to POST /api/contact
 * - This function validates required fields
 * - Calls Resend API with form data as a formatted HTML email
 * - Returns JSON { success: true } or { error: "message" }
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS headers (allow same-origin only in production) ──────────────────
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // ── Parse form data ───────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { name, email, phone, company, location, job_size, message } = body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!name || !email || !location || !job_size) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, location, job_size.' }),
        { status: 422, headers: corsHeaders }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address.' }),
        { status: 422, headers: corsHeaders }
      );
    }

    // ── Read secrets from Cloudflare environment ──────────────────────────
    // TODO: Replace placeholder values in Cloudflare Pages → Settings → Environment Variables
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const TO_EMAIL = env.CONTACT_TO_EMAIL || 'info@fillandhaul.com';
    const FROM_EMAIL = env.CONTACT_FROM_EMAIL || 'Fill & Haul <noreply@fillandhaul.com>';

    // ── Guard: if API key is placeholder, log but don't crash ────────────
    if (!RESEND_API_KEY || RESEND_API_KEY === 'REPLACE_ME') {
      console.warn('[contact] RESEND_API_KEY not configured. Email not sent.');
      // Still return success so the form UX works during development
      return new Response(
        JSON.stringify({
          success: true,
          dev_note: 'Email skipped — RESEND_API_KEY not yet configured.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Build HTML email body ─────────────────────────────────────────────
    const jobSizeLabels = {
      small: 'Small — A few items',
      medium: 'Medium — Partial room / garage',
      large: 'Large — Full room cleanout',
      xl: 'XL — Whole property / estate',
    };

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Lead — Fill & Haul</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#f97316;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                🚛 New Lead — Fill &amp; Haul
              </h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                A customer just submitted a quote request
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Name</strong><br/>
                    <span style="color:#111827;font-size:16px;">${name}</span>
                  </td>
                </tr>
                ${company ? `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Company</strong><br/>
                    <span style="color:#111827;font-size:16px;">${company}</span>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Email</strong><br/>
                    <a href="mailto:${email}" style="color:#f97316;font-size:16px;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Phone</strong><br/>
                    <span style="color:#111827;font-size:16px;">${phone || 'Not provided'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Location / Zip</strong><br/>
                    <span style="color:#111827;font-size:16px;">${location}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Job Size</strong><br/>
                    <span style="color:#111827;font-size:16px;">${jobSizeLabels[job_size] || job_size}</span>
                  </td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding:10px 0;">
                    <strong style="color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Message</strong><br/>
                    <span style="color:#111827;font-size:15px;line-height:1.6;">${message}</span>
                  </td>
                </tr>` : ''}
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="mailto:${email}"
                      style="display:inline-block;background:#f97316;color:#ffffff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                      Reply to ${name.split(' ')[0]}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This notification was sent by Fill &amp; Haul · fillandhaul.com · (602) 632-5794
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

    // ── Send via Resend API ───────────────────────────────────────────────
    // Docs: https://resend.com/docs/api-reference/emails/send-email
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `New Quote Request — ${name} (${location})`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error('[contact] Resend error:', resendResponse.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email. Please call us directly at (602) 632-5794.' }),
        { status: 502, headers: corsHeaders }
      );
    }

    // ── Success ───────────────────────────────────────────────────────────
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[contact] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again or call (602) 632-5794.' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
