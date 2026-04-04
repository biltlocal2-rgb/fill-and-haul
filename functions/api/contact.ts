/**
 * Cloudflare Pages Function — /api/contact
 *
 * Receives lead-form submissions and stores them in KV.
 * Optionally forwards to an email service (see README for setup).
 *
 * Environment bindings (set in Cloudflare dashboard):
 *   LEADS  – KV namespace for storing submissions
 *   NOTIFY_EMAIL – (optional) email address for notifications
 */

interface Env {
  LEADS?: KVNamespace;
  NOTIFY_EMAIL?: string;
}

interface LeadData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  location: string;
  job_size: string;
  message?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const data: LeadData = await request.json();

    // Basic validation
    if (!data.name || !data.email || !data.location || !data.job_size) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers }
      );
    }

    // Build lead record
    const lead = {
      ...data,
      submitted_at: new Date().toISOString(),
      source: request.headers.get('Referer') || 'direct',
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
    };

    // Store in KV if bound
    if (env.LEADS) {
      const key = `lead_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      await env.LEADS.put(key, JSON.stringify(lead), {
        // Auto-expire after 365 days (optional safety net)
        expirationTtl: 60 * 60 * 24 * 365,
      });
    }

    // Log for debugging (visible in Cloudflare dashboard → Functions logs)
    console.log('[NEW LEAD]', JSON.stringify(lead));

    return new Response(
      JSON.stringify({ success: true, message: 'Lead received' }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[LEAD ERROR]', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
