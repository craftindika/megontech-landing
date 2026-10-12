// Vercel Function — handles all form submissions from the Reservista site.
// Sends (1) an admin notification to ADMIN_EMAIL, (2) a client auto-reply.
// SMTP credentials live in Vercel environment variables — never committed.
//
// Required env vars (set in Vercel dashboard → Settings → Environment Variables):
//   SMTP_HOST      e.g. smtp.mail.us-east-1.awsapps.com
//   SMTP_PORT      465 (SSL) or 587 (STARTTLS)
//   SMTP_USER      full WorkMail email (e.g. no-reply@reservistapms.com)
//   SMTP_PASS      WorkMail mailbox password
//   ADMIN_EMAIL    destination for submissions (e.g. hello@reservista.com)
//   FROM_EMAIL     sender (must be a real WorkMail user, often same as SMTP_USER)

import nodemailer from 'nodemailer';

// ── Allowed form types + their required fields ─────────────────────────
const SCHEMAS = {
  contact:        { required: ['full_name', 'email', 'message'],                                label: 'Contact form submission' },
  demo:           { required: ['full_name', 'email', 'phone', 'hotel_name', 'preferred_date'],  label: 'Demo request' },
  kyc_waitlist:   { required: ['email'],                                                        label: 'GuestKYC waitlist signup' },
  alohi_waitlist: { required: ['email'],                                                        label: 'MyAlohi waitlist signup' },
  subscribe:      { required: ['email'],                                                        label: 'Newsletter subscription' },
  blog_subscribe: { required: ['email'],                                                        label: 'Blog newsletter subscription' },
};

// ── Brand kit ────────────────────────────────────────────────────────────
const C = {
  brand:        '#2563EB',
  brandDeep:    '#1D4ED8',
  brandIndigo:  '#6366F1',
  ink:          '#0F172A',
  inkSoft:      '#475569',
  inkMute:      '#64748B',
  inkFaint:     '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  bg:           '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceWarm:  '#F8FAFC',
  gold:         '#F59E0B',
  goldDeep:     '#D97706',
  goldLight:    '#FBBF24',
  goldBg:       '#FEF3C7',
  goldText:     '#B45309',
  green:        '#10B981',
  greenDeep:    '#047857',
  rose:         '#F43F5E',
  roseText:     '#BE123C',
};
const FONTS      = `'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const FONTS_MONO = `'JetBrains Mono',SFMono-Regular,Menlo,Consolas,monospace`;

// ── Utilities ────────────────────────────────────────────────────────────
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length < 320;
}
function prettyKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}
function formatTimestamp() {
  return new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST';
}
function firstName(full) {
  return ((full || '').trim().split(/\s+/)[0] || 'there');
}
function phoneDigits(p) {
  return p ? String(p).replace(/\D/g, '') : '';
}
function gcalUrl({ title, details, date }) {
  // Google Calendar deep-link, all-day event on the requested date
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const next = new Date(d.getTime() + 86400000);
    const yyyy2 = next.getFullYear();
    const mm2 = String(next.getMonth() + 1).padStart(2, '0');
    const dd2 = String(next.getDate()).padStart(2, '0');
    const dates = `${yyyy}${mm}${dd}/${yyyy2}${mm2}${dd2}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: details || '',
      dates,
    });
    return 'https://www.google.com/calendar/render?' + params.toString();
  } catch { return null; }
}

// ── Email building blocks (table-based for Outlook compatibility) ────────
function preheaderEl(text) {
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${C.bg};">${esc(text)}</div>`;
}
function eyebrow(text, tone = 'blue') {
  const TONES = {
    blue:  { bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.25)',  color: C.brandDeep },
    gold:  { bg: C.goldBg,                border: 'rgba(245,158,11,0.32)', color: C.goldText },
    green: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', color: C.greenDeep },
  };
  const t = TONES[tone] || TONES.blue;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr><td style="padding:5px 13px;background-color:${t.bg};border:1px solid ${t.border};border-radius:9999px;"><span style="font-family:${FONTS_MONO};font-size:10.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${t.color};">${esc(text)}</span></td></tr></table>`;
}
function h1(text) {
  return `<h1 style="margin:0 0 16px;font-family:${FONTS};font-size:25px;font-weight:800;color:${C.ink};letter-spacing:-0.4px;line-height:1.18;">${text}</h1>`;
}
function lead(text) {
  return `<p style="margin:0 0 18px;font-family:${FONTS};font-size:16px;color:${C.inkSoft};line-height:1.6;">${text}</p>`;
}
function p(text) {
  return `<p style="margin:0 0 14px;font-family:${FONTS};font-size:14px;color:${C.inkSoft};line-height:1.65;">${text}</p>`;
}
function bullets(items) {
  const li = items.map(i => `<li style="margin:0 0 8px;padding-left:6px;font-family:${FONTS};font-size:14px;color:${C.inkSoft};line-height:1.55;"><span style="color:${C.ink};">${i}</span></li>`).join('');
  return `<ul style="margin:0 0 18px;padding:0 0 0 22px;list-style:disc;color:${C.brand};">${li}</ul>`;
}
function fieldTable(rows) {
  const tr = rows
    .filter(([_, v]) => v !== '' && v != null)
    .map(([label, val]) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid ${C.border};font-family:${FONTS_MONO};font-size:10.5px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${C.inkMute};vertical-align:top;width:170px;">${esc(label)}</td>
        <td style="padding:11px 14px;border-bottom:1px solid ${C.border};font-family:${FONTS};font-size:14px;color:${C.ink};vertical-align:top;line-height:1.5;">${val}</td>
      </tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;background-color:${C.surfaceWarm};border:1px solid ${C.border};border-radius:10px;overflow:hidden;margin:0 0 22px;">${tr}</table>`;
}
function callout({ tone = 'gold', label, body }) {
  const TONES = {
    gold:  { bg: '#FFFBEB', border: 'rgba(245,158,11,0.32)', accent: C.goldText },
    green: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.28)', accent: C.greenDeep },
    blue:  { bg: 'rgba(37,99,235,0.05)',  border: 'rgba(37,99,235,0.22)',  accent: C.brandDeep },
  };
  const t = TONES[tone] || TONES.gold;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;background-color:${t.bg};border:1px solid ${t.border};border-radius:10px;"><tr><td style="padding:14px 18px;"><p style="margin:0 0 4px;font-family:${FONTS_MONO};font-size:10.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${t.accent};">${esc(label)}</p><p style="margin:0;font-family:${FONTS};font-size:14px;color:${C.ink};line-height:1.55;">${body}</p></td></tr></table>`;
}
function ctaButton(href, label, tone = 'primary') {
  const TONES = {
    primary: { bg: C.brand,    grad: `linear-gradient(135deg,${C.brandDeep} 0%,${C.brandIndigo} 100%)`, text: '#FFFFFF', border: 'transparent' },
    gold:    { bg: C.goldDeep, grad: `linear-gradient(135deg,${C.goldDeep} 0%,${C.gold} 100%)`,         text: '#0F172A', border: 'transparent' },
    ghost:   { bg: '#FFFFFF',  grad: '#FFFFFF',                                                         text: C.brandDeep, border: C.border },
  };
  const t = TONES[tone] || TONES.primary;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:0 8px 8px 0;"><tr><td align="center" style="border-radius:9999px;background-color:${t.bg};${t.border !== 'transparent' ? `border:1px solid ${t.border};` : ''}"><a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 26px;border-radius:9999px;background:${t.grad};font-family:${FONTS};font-size:14px;font-weight:700;color:${t.text};text-decoration:none;letter-spacing:-0.1px;">${esc(label)} →</a></td></tr></table>`;
}
function signOff() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 0;"><tr><td style="padding-top:22px;border-top:1px solid ${C.border};"><p style="margin:0 0 4px;font-family:${FONTS};font-size:14px;color:${C.ink};font-weight:700;">— Team Reservista</p><p style="margin:0;font-family:${FONTS};font-size:13px;color:${C.inkMute};">Megon · Hospitality infrastructure for Northeast India.</p></td></tr></table>`;
}
function brandHeader() {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.brandDeep};background-image:linear-gradient(135deg,${C.brandDeep} 0%,${C.brandIndigo} 100%);">
    <tr><td style="padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="padding-right:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="36" height="36" align="center" valign="middle" style="background-color:rgba(255,255,255,0.18);border-radius:9px;font-family:${FONTS};font-weight:800;font-size:18px;color:#ffffff;line-height:36px;">M</td>
            </tr></table>
          </td>
          <td valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="font-family:${FONTS};font-weight:800;font-size:21px;letter-spacing:-0.4px;color:#ffffff;line-height:1;">MEGON</td></tr>
              <tr><td style="padding-top:5px;font-family:${FONTS_MONO};font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.78);line-height:1;">Reservista by Megon</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>`;
}
function brandFooter(showUnsub = false) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.surfaceWarm};border-top:1px solid ${C.border};">
    <tr><td style="padding:28px 32px;">
      <p style="margin:0 0 8px;font-family:${FONTS};font-size:13px;color:${C.inkSoft};line-height:1.5;">
        <strong style="color:${C.ink};">Megon</strong> · Digital infrastructure for hospitality in Northeast India.
      </p>
      <p style="margin:0 0 14px;font-family:${FONTS};font-size:13px;color:${C.inkSoft};line-height:1.5;">
        <a href="mailto:hello@reservista.com" style="color:${C.brandDeep};text-decoration:none;">hello@reservista.com</a>
        <span style="color:${C.inkFaint};"> · </span>
        <a href="https://wa.me/919864089400" style="color:${C.brandDeep};text-decoration:none;">WhatsApp</a>
        <span style="color:${C.inkFaint};"> · </span>
        <a href="https://reservista.com" style="color:${C.brandDeep};text-decoration:none;">reservista.com</a>
      </p>
      <p style="margin:0;font-family:${FONTS_MONO};font-size:9.5px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${C.inkFaint};line-height:1.4;">
        Recognised by <span style="color:${C.inkMute};">Startup India DPIIT</span> · DIPP223285 · MASI 2025/804
      </p>
      ${showUnsub ? `<p style="margin:14px 0 0;font-family:${FONTS};font-size:11px;color:${C.inkFaint};line-height:1.4;">You're receiving this because you signed up at reservista.com. Don't want these? <a href="mailto:hello@reservista.com?subject=Unsubscribe%20me%20from%20Reservista%20Insights" style="color:${C.inkMute};text-decoration:underline;">Unsubscribe</a>.</p>` : ''}
    </td></tr>
  </table>`;
}
function emailShell({ preheaderText, content, showUnsubscribe = false, title = 'Reservista by Megon' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${esc(title)}</title>
<!--[if mso]><style type="text/css">body,table,td{font-family:Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${FONTS};-webkit-font-smoothing:antialiased;">
${preheaderEl(preheaderText)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.bg};">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${C.surface};border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04),0 12px 32px rgba(15,23,42,0.08);">
      <tr><td style="padding:0;">${brandHeader()}</td></tr>
      <tr><td style="padding:34px 32px 24px;">${content}</td></tr>
      <tr><td style="padding:0;">${brandFooter(showUnsubscribe)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Admin email templates ───────────────────────────────────────────────
const ADMIN = {
  contact(data) {
    const phoneClean = phoneDigits(data.phone);
    return {
      subject: `[Reservista] New contact inquiry — ${data.full_name || data.email}`,
      preheaderText: `${data.full_name || data.email} just reached out via the contact form.`,
      content: `
        ${eyebrow('NEW CONTACT INQUIRY', 'blue')}
        ${h1('A new lead just arrived.')}
        ${lead(`<strong style="color:${C.ink};">${esc(data.full_name || 'A site visitor')}</strong> reached out via the contact form. Aim for a reply within <strong>4 business hours</strong>.`)}
        ${fieldTable([
          ['Name',           esc(data.full_name)],
          ['Email',          `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Phone',          data.phone ? `<a href="tel:${esc(phoneClean)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.phone)}</a>` : ''],
          ['Hotel / Company',esc(data.hotel_name)],
          ['Hotel size',     esc(data.hotel_size)],
          ['Message',        data.message ? `<div style="white-space:pre-wrap;color:${C.ink};">${esc(data.message)}</div>` : ''],
          ['Source page',    esc(data.source_page)],
          ['Received',       formatTimestamp()],
        ])}
        <p style="margin:0 0 8px;font-family:${FONTS_MONO};font-size:10.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.inkMute};">Quick actions</p>
        <div>${ctaButton(`mailto:${data.email}?subject=Re:%20your%20message%20to%20Reservista`, `Reply to ${firstName(data.full_name)}`, 'primary')}${phoneClean ? ctaButton(`https://wa.me/${phoneClean}?text=Hi%20${encodeURIComponent(firstName(data.full_name))}%2C%20this%20is%20Megon%20Reservista`, 'WhatsApp', 'gold') : ''}</div>
      `,
    };
  },
  demo(data) {
    const phoneClean = phoneDigits(data.phone);
    const cal = gcalUrl({
      title: `Demo: ${data.hotel_name || data.full_name || 'Reservista'} — Reservista`,
      details: `Demo with ${data.full_name}\nEmail: ${data.email}\nPhone: ${data.phone || ''}\nProperty: ${data.hotel_name}\nRooms: ${data.rooms || ''}\nNotes: ${data.notes || ''}`,
      date: data.preferred_date,
    });
    const products = Array.isArray(data.product) ? data.product.join(', ') : data.product;
    return {
      subject: `[Reservista] Demo request — ${data.full_name} (${data.hotel_name || 'property'})`,
      preheaderText: `${data.full_name} from ${data.hotel_name} wants a demo for ${formatDate(data.preferred_date)}.`,
      content: `
        ${eyebrow('DEMO REQUEST', 'gold')}
        ${h1(`Demo booking from ${esc(data.full_name)}.`)}
        ${lead(`<strong style="color:${C.ink};">${esc(data.full_name)}</strong> from <strong style="color:${C.ink};">${esc(data.hotel_name || 'a property')}</strong> wants a personalised walkthrough. Confirm the slot within <strong>24 hours</strong>.`)}
        ${callout({ tone: 'gold', label: 'PREFERRED DATE', body: `<strong style="color:${C.ink};">${esc(formatDate(data.preferred_date))}</strong>` })}
        ${fieldTable([
          ['Name',         esc(data.full_name)],
          ['Email',        `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Phone',        data.phone ? `<a href="tel:${esc(phoneClean)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.phone)}</a>` : ''],
          ['Hotel name',   esc(data.hotel_name)],
          ['Rooms',        esc(data.rooms)],
          ['Product',      esc(products)],
          ['Preferred date', esc(formatDate(data.preferred_date))],
          ['Notes',        data.notes ? `<div style="white-space:pre-wrap;color:${C.ink};">${esc(data.notes)}</div>` : ''],
          ['Source page',  esc(data.source_page)],
          ['Received',     formatTimestamp()],
        ])}
        <p style="margin:0 0 8px;font-family:${FONTS_MONO};font-size:10.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.inkMute};">Quick actions</p>
        <div>${ctaButton(`mailto:${data.email}?subject=Re:%20your%20Reservista%20demo%20on%20${encodeURIComponent(formatDate(data.preferred_date))}`, `Confirm with ${firstName(data.full_name)}`, 'primary')}${phoneClean ? ctaButton(`https://wa.me/${phoneClean}?text=Hi%20${encodeURIComponent(firstName(data.full_name))}%2C%20following%20up%20on%20your%20Reservista%20demo`, 'WhatsApp', 'gold') : ''}${cal ? ctaButton(cal, 'Add to calendar', 'ghost') : ''}</div>
      `,
    };
  },
  kyc_waitlist(data) {
    return {
      subject: `[Reservista] GuestKYC waitlist — ${data.email}`,
      preheaderText: `${data.email} just joined the GuestKYC waitlist.`,
      content: `
        ${eyebrow('GUESTKYC WAITLIST', 'green')}
        ${h1('Someone joined the GuestKYC waitlist.')}
        ${lead(`Notify them when GuestKYC ships. They're expecting a launch update.`)}
        ${fieldTable([
          ['Email',       `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Source page', esc(data.source_page)],
          ['Received',    formatTimestamp()],
        ])}
        <div>${ctaButton(`mailto:${data.email}?subject=Re:%20Your%20GuestKYC%20waitlist%20signup`, 'Reply to them', 'primary')}</div>
      `,
    };
  },
  alohi_waitlist(data) {
    return {
      subject: `[Reservista] MyAlohi waitlist — ${data.email}`,
      preheaderText: `${data.email} just joined the MyAlohi waitlist.`,
      content: `
        ${eyebrow('MYALOHI WAITLIST', 'green')}
        ${h1('Someone joined the MyAlohi waitlist.')}
        ${lead(`Notify them when MyAlohi (direct-booking websites) ships.`)}
        ${fieldTable([
          ['Email',       `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Source page', esc(data.source_page)],
          ['Received',    formatTimestamp()],
        ])}
        <div>${ctaButton(`mailto:${data.email}?subject=Re:%20Your%20MyAlohi%20waitlist%20signup`, 'Reply to them', 'primary')}</div>
      `,
    };
  },
  subscribe(data) {
    return {
      subject: `[Reservista] New newsletter signup — ${data.email}`,
      preheaderText: `${data.email} subscribed to Reservista Insights.`,
      content: `
        ${eyebrow('NEWSLETTER · NEW SIGNUP', 'blue')}
        ${h1('New newsletter subscriber.')}
        ${lead(`Add to the Insights distribution list.`)}
        ${fieldTable([
          ['Email',       `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Source page', esc(data.source_page)],
          ['Received',    formatTimestamp()],
        ])}
      `,
    };
  },
  blog_subscribe(data) {
    return {
      subject: `[Reservista] New blog subscriber — ${data.email}`,
      preheaderText: `${data.email} subscribed via the blog.`,
      content: `
        ${eyebrow('BLOG · NEW SUBSCRIBER', 'blue')}
        ${h1('New blog subscriber.')}
        ${lead(`Add to the Insights distribution list.`)}
        ${fieldTable([
          ['Email',       `<a href="mailto:${esc(data.email)}" style="color:${C.brandDeep};text-decoration:none;">${esc(data.email)}</a>`],
          ['Source page', esc(data.source_page)],
          ['Received',    formatTimestamp()],
        ])}
      `,
    };
  },
};

// ── Client auto-reply templates ─────────────────────────────────────────
const CLIENT = {
  contact(data) {
    const fn = firstName(data.full_name);
    return {
      subject: 'We received your message — Reservista by Megon',
      preheaderText: `Hi ${fn}, we got your message. Reply within 4 business hours.`,
      showUnsub: false,
      content: `
        ${eyebrow('MESSAGE RECEIVED', 'blue')}
        ${h1(`Thanks, ${esc(fn)}.`)}
        ${lead(`We received your message and a member of our team will reply within <strong>4 business hours</strong>.`)}
        ${callout({ tone: 'gold', label: 'NEED IT FASTER?', body: `For anything urgent, message us on WhatsApp at <a href="https://wa.me/919864089400" style="color:${C.brandDeep};text-decoration:none;">+91 98640 89400</a>. Replies typically in minutes.` })}
        ${p(`In the meantime, here's where most people start:`)}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://reservista.com/pms', 'See Reservista PMS', 'primary')}
          ${ctaButton('https://reservista.com/pos', 'See Reservista POS', 'ghost')}
        </div>
        ${signOff()}
      `,
    };
  },
  demo(data) {
    const fn = firstName(data.full_name);
    const dateText = formatDate(data.preferred_date);
    return {
      subject: 'Your demo with Reservista is booked',
      preheaderText: `Hi ${fn}, your demo for ${dateText} is in. We'll confirm within 24 hours.`,
      showUnsub: false,
      content: `
        ${eyebrow('DEMO BOOKING CONFIRMED', 'green')}
        ${h1(`You're booked, ${esc(fn)}.`)}
        ${lead(`Your demo request for <strong style="color:${C.ink};">${esc(dateText)}</strong> is in. Our product specialist will reach out within <strong>24 hours</strong> to confirm the exact slot.`)}
        ${callout({ tone: 'blue', label: 'WHAT HAPPENS NEXT', body: `A 30-minute personalised walkthrough — no slides, no sales pressure. Just Reservista running on a property like yours.` })}
        ${p(`<strong style="color:${C.ink};">In your demo, you'll get:</strong>`)}
        ${bullets([
          `A live walkthrough of <strong>PMS</strong> and/or <strong>POS</strong>, focused on your property type and size`,
          `A real Q&amp;A with someone who genuinely understands hotel operations`,
          `A trial account so you can keep exploring after the call`,
        ])}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://wa.me/919864089400?text=Hi%20Megon%2C%20about%20my%20Reservista%20demo', 'WhatsApp the team', 'primary')}
          ${ctaButton('https://reservista.com/pms', 'See PMS', 'ghost')}
        </div>
        ${signOff()}
      `,
    };
  },
  kyc_waitlist(data) {
    return {
      subject: "You're on the GuestKYC waitlist — Reservista",
      preheaderText: `We'll email you the moment GuestKYC opens for early access.`,
      showUnsub: true,
      content: `
        ${eyebrow('GUESTKYC WAITLIST', 'green')}
        ${h1(`You're in.`)}
        ${lead(`Thanks for joining the GuestKYC waitlist. We'll email you the moment it opens for early access — waitlist signups get priority onboarding.`)}
        ${callout({ tone: 'gold', label: 'WHAT TO EXPECT', body: `One email when GuestKYC is ready (no marketing fluff in between). You'll be among the first hotels to verify guests in seconds — Aadhaar / passport OCR, face match, auto Form C.` })}
        ${p(`Until then, run your bookings, billing and rooms on Reservista PMS — already in production at hotels across Northeast India.`)}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://reservista.com/pms', 'See Reservista PMS', 'primary')}
          ${ctaButton('https://wa.me/919864089400', 'WhatsApp Us', 'ghost')}
        </div>
        ${signOff()}
      `,
    };
  },
  alohi_waitlist(data) {
    return {
      subject: "You're on the MyAlohi waitlist — Reservista",
      preheaderText: `We'll email you the moment MyAlohi opens for early access.`,
      showUnsub: true,
      content: `
        ${eyebrow('MYALOHI WAITLIST', 'green')}
        ${h1(`You're in.`)}
        ${lead(`Thanks for joining the MyAlohi waitlist. We'll email you the moment it opens — early signups get launch pricing and priority onboarding.`)}
        ${callout({ tone: 'gold', label: 'WHAT YOU GET WHEN IT LAUNCHES', body: `A direct-booking website on your own domain — mobile-first, brand-fit, with rates and inventory synced from your PMS. Stop losing 20%+ to OTA commissions.` })}
        ${p(`In the meantime, the rest of Reservista (PMS, POS) is already live.`)}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://reservista.com/pms', 'See Reservista PMS', 'primary')}
          ${ctaButton('https://wa.me/919864089400', 'WhatsApp Us', 'ghost')}
        </div>
        ${signOff()}
      `,
    };
  },
  subscribe(data) {
    return {
      subject: 'Welcome to Reservista Insights',
      preheaderText: `You're subscribed. Practical hospitality tips, weekly.`,
      showUnsub: true,
      content: `
        ${eyebrow('NEWSLETTER · CONFIRMED', 'green')}
        ${h1(`Welcome aboard.`)}
        ${lead(`You're subscribed to <strong style="color:${C.ink};">Reservista Insights</strong> — practical, no-fluff tips on operations, bookings, billing and revenue. Once a week, straight to your inbox.`)}
        ${p(`<strong style="color:${C.ink};">What you'll get:</strong>`)}
        ${bullets([
          `Operational playbooks that hoteliers in Northeast India actually use`,
          `Revenue moves — RevPAR, ADR, occupancy — explained simply`,
          `Tech &amp; tools breakdowns, with no vendor sales pitches`,
          `Occasional behind-the-scenes from the Megon team`,
        ])}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://reservista.com/blog', 'Read recent posts', 'primary')}
          ${ctaButton('https://reservista.com/pms', 'See Reservista PMS', 'ghost')}
        </div>
        ${signOff()}
      `,
    };
  },
  blog_subscribe(data) {
    return {
      subject: 'Welcome to Reservista Insights',
      preheaderText: `You're subscribed to the Reservista blog.`,
      showUnsub: true,
      content: `
        ${eyebrow('BLOG · SUBSCRIBED', 'green')}
        ${h1(`You're on the list.`)}
        ${lead(`Thanks for subscribing to <strong style="color:${C.ink};">Reservista Insights</strong>. Revenue, PMS tips, and hospitality tech — direct from the team.`)}
        ${p(`<strong style="color:${C.ink};">Three of our most-read posts to start:</strong>`)}
        ${bullets([
          `<a href="https://reservista.com/blog/dynamic-pricing" style="color:${C.brandDeep};text-decoration:none;">Dynamic pricing for independent hotels: a practical playbook</a>`,
          `<a href="https://reservista.com/blog/morning-routine" style="color:${C.brandDeep};text-decoration:none;">The 10-minute morning routine that keeps your front desk stress-free</a>`,
          `<a href="https://reservista.com/blog/ota-vs-direct" style="color:${C.brandDeep};text-decoration:none;">OTA vs. direct bookings: where your hotel should actually invest</a>`,
        ])}
        <div style="margin:0 0 6px;">
          ${ctaButton('https://reservista.com/blog', 'Browse all posts', 'primary')}
        </div>
        ${signOff()}
      `,
    };
  },
};

// ── Plain-text fallbacks (used as `text` alongside HTML) ────────────────
function adminText(formType, data) {
  const lines = [`[Reservista] ${SCHEMAS[formType].label}`, '─────────────────────────────'];
  Object.entries(data)
    .filter(([k, v]) => !['form_type', 'website', 'honey'].includes(k) && v !== '' && v != null)
    .forEach(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : v;
      lines.push(`${prettyKey(k)}: ${val}`);
    });
  lines.push('', `Received: ${formatTimestamp()}`);
  return lines.join('\n');
}
function clientText(formType, data) {
  const fn = firstName(data.full_name);
  const sub = CLIENT[formType] && CLIENT[formType](data).subject;
  const intros = {
    contact:        `Hi ${fn},\n\nWe received your message and a member of our team will reply within 4 business hours.\n\nFor anything urgent, message us on WhatsApp: +91 98640 89400.`,
    demo:           `Hi ${fn},\n\nYour demo request for ${formatDate(data.preferred_date)} is in. Our product specialist will reach out within 24 hours to confirm the exact slot.\n\nWhat to expect: a 30-minute personalised walkthrough — no slides, no sales pressure.`,
    kyc_waitlist:   `You're on the GuestKYC waitlist.\n\nWe'll email you the moment it opens for early access. Waitlist signups get priority onboarding.`,
    alohi_waitlist: `You're on the MyAlohi waitlist.\n\nWe'll email you the moment it opens. Waitlist signups get launch pricing and priority onboarding.`,
    subscribe:      `Welcome to Reservista Insights.\n\nYou'll get practical, no-fluff hospitality tips once a week — operations, bookings, billing, revenue.`,
    blog_subscribe: `Welcome to Reservista Insights.\n\nYou'll get practical hospitality tips once a week — direct from the Megon team.`,
  };
  return [intros[formType] || intros.contact, '', '— Team Reservista', 'Megon · reservista.com · hello@reservista.com'].join('\n');
}

// ── Top-level renders ───────────────────────────────────────────────────
function renderAdmin(formType, data) {
  const t = ADMIN[formType](data);
  return {
    subject: t.subject,
    html: emailShell({ preheaderText: t.preheaderText, content: t.content, showUnsubscribe: false, title: t.subject }),
    text: adminText(formType, data),
  };
}
function renderClient(formType, data) {
  const t = CLIENT[formType](data);
  return {
    subject: t.subject,
    html: emailShell({ preheaderText: t.preheaderText, content: t.content, showUnsubscribe: !!t.showUnsub, title: t.subject }),
    text: clientText(formType, data),
  };
}

// ── Main handler ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const data = (req.body && typeof req.body === 'object') ? req.body : {};

  // Honeypot — silently "succeed" to avoid tipping off bots
  if ((data.website && String(data.website).trim()) || (data.honey && String(data.honey).trim())) {
    return res.status(200).json({ ok: true });
  }

  const formType = data.form_type;
  const schema = SCHEMAS[formType];
  if (!schema) return res.status(400).json({ ok: false, error: 'Unknown form type' });

  for (const f of schema.required) {
    if (!data[f] || String(data[f]).trim().length === 0) {
      return res.status(400).json({ ok: false, error: `Missing required field: ${f}` });
    }
  }
  if (!isValidEmail(data.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }

  const env = process.env;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.FROM_EMAIL || !env.ADMIN_EMAIL) {
    console.error('[send-form] missing SMTP env vars');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const port = parseInt(env.SMTP_PORT || '465', 10);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  try {
    const admin = renderAdmin(formType, data);
    const client = renderClient(formType, data);

    await transporter.sendMail({
      from: `"Reservista Site" <${env.FROM_EMAIL}>`,
      to: env.ADMIN_EMAIL,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
      replyTo: data.email,
    });

    await transporter.sendMail({
      from: `"Reservista by Megon" <${env.FROM_EMAIL}>`,
      to: data.email,
      subject: client.subject,
      html: client.html,
      text: client.text,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send-form] SMTP error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'Unable to send. Please try again shortly.' });
  }
}
