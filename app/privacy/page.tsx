export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#0f0f17', minHeight: '100vh', color: '#f0f0f8', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: '#6b6c80', marginBottom: '3rem' }}>Last updated: June 15, 2026</p>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>1. Who We Are</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>RevOverflow is operated by SiMaYa Labs. We provide AI-powered revenue and customer retention tools for small businesses. This policy explains how we collect, use, and protect information when you use our platform.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>2. Information We Collect</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>We collect information that merchants provide when creating an account (business name, email address), transaction and customer data synced from connected point-of-sale systems (such as Square), and usage data to improve our services.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>3. SMS Messaging</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>RevOverflow sends SMS messages on behalf of merchants to their customers as part of win-back and retention campaigns. Customer phone numbers are collected by merchants at the point of sale. Every SMS message includes a STOP opt-out instruction. Customers who reply STOP will be immediately removed from future messaging. Message and data rates may apply.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>4. How We Use Information</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>We use collected information to provide and improve our services, send win-back SMS and email campaigns on behalf of merchants, calculate customer scores and segments, and process billing and subscription management.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>5. Data Sharing</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>We do not sell personal data. We share data only with service providers necessary to operate the platform (such as Telnyx for SMS delivery, Resend for email delivery, and Stripe for payments), and only to the extent required to provide the service.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>6. Data Security</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>We use industry-standard security practices including encryption in transit and at rest. Access to sensitive credentials is restricted and never stored in plain text.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>7. Your Rights</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>You may request access to, correction of, or deletion of your personal data at any time by contacting us at support@revoverflow.com. SMS recipients may opt out at any time by replying STOP.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>8. Contact</h2>
          <p style={{ color: '#9899b0', lineHeight: 1.8 }}>For privacy-related questions, contact us at <a href="mailto:support@revoverflow.com" style={{ color: '#a78bfa' }}>support@revoverflow.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
