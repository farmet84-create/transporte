export function abrirContratoPDF() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Service Agreement — WaappBusiness</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --navy: #090d1b; --indigo: #4f46e5; --slate: #1e293b; --gray: #64748b; --light: #f8fafc; --border: #e2e8f0; --gold: #f59e0b; }
  body { font-family: 'Inter', sans-serif; background: var(--light); color: var(--slate); font-size: 14px; line-height: 1.7; }
  .cover { background: var(--navy); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; text-align: center; position: relative; overflow: hidden; }
  .cover::before { content: ''; position: absolute; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%); top: -200px; right: -200px; }
  .cover::after { content: ''; position: absolute; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%); bottom: -150px; left: -150px; }
  .logo-wrap { display: flex; align-items: center; gap: 14px; margin-bottom: 60px; position: relative; z-index: 1; }
  .logo-icon { width: 56px; height: 56px; background: var(--indigo); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
  .logo-text .name { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
  .logo-text .tag { font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; }
  .cover-badge { background: rgba(79,70,229,0.2); border: 1px solid rgba(79,70,229,0.4); color: #a5b4fc; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 6px 20px; border-radius: 20px; margin-bottom: 28px; position: relative; z-index: 1; }
  .cover h1 { font-family: 'Playfair Display', serif; font-size: clamp(30px,5vw,50px); color: #fff; line-height: 1.15; max-width: 700px; margin-bottom: 20px; position: relative; z-index: 1; }
  .cover h1 span { color: #a5b4fc; }
  .cover-sub { color: rgba(255,255,255,0.5); font-size: 15px; max-width: 500px; margin-bottom: 60px; position: relative; z-index: 1; }
  .cover-meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; width: 100%; max-width: 600px; position: relative; z-index: 1; }
  .cover-meta-item { background: rgba(255,255,255,0.04); padding: 20px 24px; text-align: center; }
  .cover-meta-item .label { font-size: 10px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .cover-meta-item .value { font-size: 15px; font-weight: 600; color: #fff; }
  .doc { max-width: 860px; margin: 0 auto; padding: 60px 40px 80px; }
  .section { margin-bottom: 48px; }
  .section-num { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--navy); color: #fff; font-size: 12px; font-weight: 700; border-radius: 8px; margin-bottom: 10px; }
  .section h2 { font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid var(--border); }
  .section p { color: var(--slate); margin-bottom: 12px; font-size: 14px; }
  .section ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .section li { font-size: 14px; color: var(--slate); }
  .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  .info-table th { background: var(--navy); color: #fff; padding: 12px 18px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .info-table td { padding: 12px 18px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--slate); }
  .info-table tr:last-child td { border-bottom: none; }
  .info-table tr:nth-child(even) td { background: #f8fafc; }
  .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 32px 0; }
  .price-card { border: 2px solid var(--border); border-radius: 16px; padding: 28px; background: #fff; position: relative; }
  .price-card.featured { border-color: var(--indigo); background: linear-gradient(135deg,#f0f0ff 0%,#fff 100%); }
  .price-card .badge { position: absolute; top: -12px; right: 20px; background: var(--indigo); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  .price-card .plan-name { font-size: 12px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
  .price-card .amount { font-size: 38px; font-weight: 800; color: var(--navy); line-height: 1; margin-bottom: 4px; }
  .price-card .amount span { font-size: 18px; font-weight: 500; color: var(--gray); }
  .price-card .period { font-size: 12px; color: var(--gray); margin-bottom: 20px; }
  .price-card ul { list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 8px; }
  .price-card ul li { font-size: 13px; color: var(--slate); display: flex; align-items: center; gap: 8px; }
  .price-card ul li::before { content: '✓'; color: var(--indigo); font-weight: 700; font-size: 12px; flex-shrink: 0; }
  .highlight { background: linear-gradient(135deg,#eff6ff 0%,#f0f0ff 100%); border: 1px solid #c7d2fe; border-left: 4px solid var(--indigo); border-radius: 10px; padding: 18px 22px; margin: 20px 0; font-size: 14px; color: var(--slate); }
  .highlight strong { color: var(--indigo); }
  .warning { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid var(--gold); border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 13px; color: #92400e; }
  .discount-banner { background: linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border: 1px solid #86efac; border-left: 4px solid #22c55e; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #15803d; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; padding-top: 40px; border-top: 2px solid var(--border); }
  .sig-block .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gray); margin-bottom: 20px; display: block; }
  .sig-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 30px; }
  .sig-field .field-label { font-size: 11px; color: var(--gray); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .sig-field .field-line { border-bottom: 1px solid var(--border); height: 28px; }
  .sig-line { border-top: 1px solid var(--navy); padding-top: 10px; margin-top: 40px; }
  .sig-line .name { font-size: 14px; font-weight: 600; color: var(--navy); }
  .sig-line .role { font-size: 12px; color: var(--gray); }
  .doc-footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .doc-footer .brand { display: flex; align-items: center; gap: 10px; }
  .doc-footer .brand-icon { width: 32px; height: 32px; background: var(--navy); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .doc-footer .brand-name { font-size: 13px; font-weight: 700; color: var(--navy); }
  .doc-footer .brand-url { font-size: 11px; color: var(--gray); }
  .doc-footer .page-info { font-size: 11px; color: var(--gray); text-align: right; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
  .blank { border-bottom: 1px solid #cbd5e1; min-height: 26px; display: block; }
  @media print { .cover { page-break-after: always; } }
</style>
</head>
<body>
<div class="cover">
  <div class="logo-wrap">
    <div class="logo-icon">🚀</div>
    <div class="logo-text">
      <div class="name">WaappBusiness</div>
      <div class="tag">Automating Growth · waapp.live</div>
    </div>
  </div>
  <div class="cover-badge">SaaS Service Agreement</div>
  <h1>Transport <span>Profitability</span> Platform</h1>
  <p class="cover-sub">Software as a Service Agreement between WaappBusiness and the Client for access to and use of the transport management and profitability platform.</p>
  <div class="cover-meta">
    <div class="cover-meta-item"><div class="label">Version</div><div class="value">1.0</div></div>
    <div class="cover-meta-item"><div class="label">Date</div><div class="value">June 2026</div></div>
    <div class="cover-meta-item"><div class="label">Confidential</div><div class="value">Yes</div></div>
  </div>
</div>
<div class="doc">
  <div class="section">
    <div class="section-num">1</div>
    <h2>Parties to the Agreement</h2>
    <table class="info-table">
      <tr><th colspan="2">Service Provider</th></tr>
      <tr><td><strong>Company Name</strong></td><td>WaappBusiness</td></tr>
      <tr><td><strong>Registered Address</strong></td><td>Gujarat, India</td></tr>
      <tr><td><strong>GSTIN</strong></td><td>24DUKPS5774J1ZB</td></tr>
      <tr><td><strong>Website</strong></td><td>waapp.live</td></tr>
      <tr><td><strong>Support Email</strong></td><td>support@waapp.live</td></tr>
      <tr><td><strong>WhatsApp Support</strong></td><td>+1 205 315 4423</td></tr>
    </table>
    <table class="info-table">
      <tr><th colspan="2">Client</th></tr>
      <tr><td><strong>Company / Full Name</strong></td><td>COMERCIALIZADORA QUIRAL D. SAS</td></tr>
      <tr><td><strong>Tax ID / NIT</strong></td><td>901062379-1</td></tr>
      <tr><td><strong>Address</strong></td><td>CR 22 66A 20, Bogotá D.C., Colombia</td></tr>
      <tr><td><strong>Email Address</strong></td><td>tributacionesquirald@hotmail.com</td></tr>
      <tr><td><strong>Phone Number</strong></td><td>310 242 3623</td></tr>
      <tr><td><strong>Country</strong></td><td>Colombia</td></tr>
    </table>
  </div>
  <div class="section">
    <div class="section-num">2</div>
    <h2>Scope of Services</h2>
    <p>This Agreement governs access to and use of the <strong>WaappBusiness Transport Profitability Platform</strong>, a cloud-based SaaS solution that enables transport companies to manage trips, costs, revenues, and analyse real-time profitability.</p>
    <ul>
      <li>Executive dashboard with real-time KPIs</li>
      <li>Trip registration and management</li>
      <li>Direct expense tracking per trip (fuel, tolls, per diem, etc.)</li>
      <li>Fleet, driver, and client management</li>
      <li>Monthly operating and administrative cost control</li>
      <li>Profitability reports by vehicle, driver, client, and period</li>
      <li>AI analytics and recommendations</li>
      <li>Document expiry alerts (insurance, inspections, licences)</li>
      <li>User management and role-based access control</li>
      <li>Full audit trail of all changes</li>
    </ul>
  </div>
  <div class="section">
    <div class="section-num">3</div>
    <h2>Subscription Plans &amp; Fees</h2>
    <div class="discount-banner">🎉 <strong>Special Discount Applied:</strong> This client has been granted a negotiated rate of <strong>$395 USD/month</strong> (standard Base Plan rate: $410 USD/month), valid for the duration of this agreement.</div>
    <div class="pricing-grid">
      <div class="price-card featured">
        <div class="badge">Active Plan</div>
        <div class="plan-name">Base Plan — Special Rate</div>
        <div class="amount">$395 <span>USD</span></div>
        <div class="period">per month · billed monthly</div>
        <ul>
          <li>5 agents included</li>
          <li>Full access to all modules</li>
          <li>Priority support</li>
          <li>All updates included</li>
          <li>Cloud storage &amp; backups</li>
          <li>Monthly auto-renewal</li>
        </ul>
      </div>
      <div class="price-card">
        <div class="badge" style="background:var(--gold);color:#000;">★ Best Value</div>
        <div class="plan-name">Team Plan</div>
        <div class="amount">$700 <span>USD</span></div>
        <div class="period">per month · 10 agents</div>
        <ul>
          <li>10 agents included</li>
          <li>Full access to all modules</li>
          <li>Priority VIP support</li>
          <li>All updates included</li>
          <li>Dedicated account manager</li>
        </ul>
      </div>
    </div>
    <table class="info-table">
      <tr><th>Item</th><th>Fee</th></tr>
      <tr><td>Base Plan — Special negotiated rate</td><td><strong>$395 USD / month</strong> <span style="text-decoration:line-through;color:#9ca3af;font-size:12px;">$410</span></td></tr>
      <tr><td>Each additional agent (beyond 5)</td><td><strong>$100 USD / month per agent</strong></td></tr>
      <tr><td>Currency</td><td><strong>United States Dollar (USD)</strong></td></tr>
      <tr><td>Payment gateway</td><td><strong>MercadoPago</strong></td></tr>
    </table>
    <div class="highlight"><strong>Billing Note:</strong> Monthly fees are invoiced in advance. The subscription renews automatically each month unless either party provides written notice of non-renewal at least <strong>30 calendar days</strong> before the renewal date.</div>
  </div>
  <div class="section">
    <div class="section-num">4</div>
    <h2>Priority Support</h2>
    <ul>
      <li>Email support at <strong>support@waapp.live</strong> — max response time <strong>4 business hours</strong></li>
      <li>WhatsApp at <strong>+1 205 315 4423</strong> — Monday to Friday, 09:00–18:00 IST</li>
      <li>Up to <strong>2 onboarding sessions</strong> via video call at no extra charge</li>
      <li>All platform updates included at no extra cost</li>
      <li>Automatic daily data backups</li>
    </ul>
  </div>
  <div class="section">
    <div class="section-num">5</div>
    <h2>Term and Renewal</h2>
    <p>This Agreement is effective from the service activation date and renews automatically each month. Either party may provide written notice of non-renewal at least <strong>30 calendar days</strong> before the next renewal date.</p>
    <div class="warning">⚠️ If payment is overdue by more than <strong>15 calendar days</strong>, WaappBusiness reserves the right to suspend access until the outstanding balance is settled in full.</div>
  </div>
  <div class="section">
    <div class="section-num">6</div>
    <h2>Cancellation and Termination</h2>
    <ul>
      <li>Cancellation requires written notice at least <strong>30 calendar days</strong> before next renewal</li>
      <li>No refunds for partial months once a billing period has commenced</li>
      <li>Upon cancellation, read-only access retained for <strong>30 days</strong> for data export</li>
      <li>Client data permanently deleted within <strong>90 days</strong> of termination</li>
    </ul>
  </div>
  <div class="section">
    <div class="section-num">7</div>
    <h2>Data Protection</h2>
    <p>All Client data remains the exclusive property of the Client. WaappBusiness commits to processing data only to deliver the contracted service and complying with applicable data protection laws including <strong>GDPR</strong> and India's <strong>DPDPA 2023</strong>.</p>
  </div>
  <div class="section">
    <div class="section-num">8</div>
    <h2>Governing Law</h2>
    <p>This Agreement is governed by the laws of <strong>India</strong>. Disputes shall be resolved through arbitration under the <strong>Indian Arbitration and Conciliation Act, 1996</strong>, seat in <strong>Ahmedabad, Gujarat</strong>.</p>
  </div>
  <hr class="divider" />
  <div class="section">
    <h2>Subscription Details</h2>
    <table class="info-table">
      <tr><th>Item</th><th>Details</th></tr>
      <tr><td>Selected Plan</td><td>Base Plan — Special Rate</td></tr>
      <tr><td>Monthly Fee (USD)</td><td>$395 USD</td></tr>
      <tr><td>Service Start Date</td><td>July 1, 2026</td></tr>
      <tr><td>Payment Method</td><td>MercadoPago</td></tr>
    </table>
  </div>
  <div class="signatures">
    <div class="sig-block">
      <span class="label">For the Service Provider</span>
      <div class="sig-fields">
        <div class="sig-field">
          <div class="field-label">Signature</div>
          <div style="height:80px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:8px 0;">
            <svg viewBox="0 0 340 75" xmlns="http://www.w3.org/2000/svg" style="width:300px;height:70px;overflow:visible;">
              <defs><style>.sig-path{fill:none;stroke:#1a1060;stroke-linecap:round;stroke-linejoin:round;}</style></defs>
              <path class="sig-path" stroke-width="2.4" d="M8,58 C12,40 16,24 22,14 C26,7 30,7 32,14 C36,28 38,44 42,58"/>
              <path class="sig-path" stroke-width="1.6" d="M14,38 Q28,34 40,38"/>
              <path class="sig-path" stroke-width="2" d="M48,10 L48,58"/>
              <path class="sig-path" stroke-width="2" d="M48,38 Q58,30 66,22"/>
              <path class="sig-path" stroke-width="2" d="M48,38 Q58,46 68,58"/>
              <path class="sig-path" stroke-width="2" d="M76,34 C72,30 72,26 78,26 C86,26 88,34 82,38 C76,42 74,46 80,50 C86,54 90,50 86,46"/>
              <path class="sig-path" stroke-width="2" d="M96,10 L96,58"/>
              <path class="sig-path" stroke-width="2" d="M96,34 C102,26 112,24 116,30 L116,58"/>
              <path class="sig-path" stroke-width="2" d="M134,34 C130,26 120,26 120,36 C120,48 130,52 136,46 L136,58"/>
              <path class="sig-path" stroke-width="2" d="M142,28 L150,50"/>
              <path class="sig-path" stroke-width="2" d="M158,28 L148,58 C144,68 138,70 134,68"/>
              <path class="sig-path" stroke-width="2.2" d="M172,14 L172,58 C172,58 184,56 196,54 C200,42 198,34 196,24 C190,14 178,14 172,14 Z"/>
              <path class="sig-path" stroke-width="2.2" d="M216,20 C210,14 204,14 204,22 C204,30 216,34 216,42 C216,52 206,54 200,48"/>
              <path class="sig-path" stroke-width="2" d="M222,10 L222,58"/>
              <path class="sig-path" stroke-width="2" d="M222,34 C228,26 238,24 242,30 L242,58"/>
              <path class="sig-path" stroke-width="2" d="M260,34 C256,26 246,26 246,36 C246,48 256,52 262,46 L262,58"/>
              <path class="sig-path" stroke-width="2" d="M268,28 L268,58"/>
              <path class="sig-path" stroke-width="2" d="M268,36 C272,28 280,26 284,30"/>
              <path class="sig-path" stroke-width="2" d="M300,10 L300,58"/>
              <path class="sig-path" stroke-width="2" d="M300,46 C296,52 286,52 284,42 C282,32 288,26 296,28 C300,29 300,34 300,38"/>
              <path class="sig-path" stroke-width="1.6" d="M306,58 C316,52 326,44 330,36 C334,28 328,22 320,28 C314,32 312,42 316,50 C320,58 330,60 334,56"/>
              <path class="sig-path" stroke-width="0.8" d="M4,66 C60,62 120,68 180,64 C240,60 290,66 336,63" opacity="0.25"/>
            </svg>
          </div>
        </div>
        <div class="sig-field">
          <div class="field-label">Full Name</div>
          <div style="border-bottom:1px solid #e2e8f0;padding:6px 0;font-size:15px;font-weight:700;color:#090d1b;">Akshay D Sharda</div>
        </div>
        <div class="sig-field">
          <div class="field-label">Title</div>
          <div style="border-bottom:1px solid #e2e8f0;padding:6px 0;font-size:14px;color:#1e293b;">Chief Executive Officer</div>
        </div>
        <div class="sig-field">
          <div class="field-label">Date</div>
          <div style="border-bottom:1px solid #e2e8f0;padding:6px 0;font-size:14px;color:#1e293b;">June 22, 2026</div>
        </div>
      </div>
      <div class="sig-line"><div class="name">WaappBusiness</div><div class="role">Gujarat, India · waapp.live</div></div>
    </div>
    <div class="sig-block">
      <span class="label">For the Client</span>
      <div class="sig-fields">
        <div class="sig-field"><div class="field-label">Signature</div><div class="field-line"></div></div>
        <div class="sig-field"><div class="field-label">Full Name</div><div class="field-line"></div></div>
        <div class="sig-field"><div class="field-label">Title / Legal Representative</div><div class="field-line"></div></div>
        <div class="sig-field"><div class="field-label">Date</div><div class="field-line"></div></div>
      </div>
      <div class="sig-line"><div class="name">COMERCIALIZADORA QUIRAL D. SAS</div><div class="role">Authorised Signatory</div></div>
    </div>
  </div>
  <div class="doc-footer">
    <div class="brand">
      <div class="brand-icon">🚀</div>
      <div><div class="brand-name">WaappBusiness</div><div class="brand-url">waapp.live · support@waapp.live</div></div>
    </div>
    <div class="page-info">SaaS Service Agreement v1.0<br>Confidential — for the exclusive use of the contracting parties</div>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 500)
}
