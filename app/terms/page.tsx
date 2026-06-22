export default function TermsPage() {
  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: '#9396A8', marginBottom: '3rem' }}>Last updated: June 15, 2026</p>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>By accessing or using RevOverflow, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>2. Description of Service</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>RevOverflow is an AI-powered revenue operator for small businesses. It connects to point-of-sale systems, analyzes customer behaviour, and sends automated win-back campaigns via email and SMS on behalf of merchants.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>3. Merchant Responsibilities</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>Merchants are responsible for ensuring they have appropriate consent to contact their customers via SMS and email. Merchants must comply with all applicable laws including the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and any other applicable regulations in their jurisdiction.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>4. SMS Messaging Terms</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>RevOverflow sends SMS messages on behalf of merchants to their customers. Message frequency varies based on campaign settings. Message and data rates may apply. Customers may opt out at any time by replying STOP. For help, reply HELP or contact support@revoverflow.com.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>5. Billing and Credits</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>RevOverflow operates on a subscription plus credit model. Monthly credits are granted based on your plan and do not roll over. Additional credits may be purchased. Subscriptions auto-renew monthly unless cancelled. Refunds are not provided for unused credits.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>6. Prohibited Uses</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>You may not use RevOverflow to send spam, unsolicited messages, or messages to individuals who have opted out. You may not use the platform for any unlawful purpose or in any way that violates these terms.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>7. Limitation of Liability</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>RevOverflow is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from use of the platform. Our total liability shall not exceed the amount paid by you in the 3 months preceding the claim.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>8. Termination</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>We may terminate or suspend your account at any time for violation of these terms. You may cancel your subscription at any time through the Account page.</p>
        </section>

        <section id="guarantee" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>9. Performance Guarantee</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '0.75rem' }}>Core, Brain, Empire, and Network plan merchants are eligible for the 3× ROI guarantee only if, on the date of activation, the account: (a) has at least one point-of-sale system connected, and (b) has at least 1,000 reachable customers (customers with a phone number or email on file) synced into RevOverflow. Accounts that do not meet this threshold are not eligible for the guarantee, regardless of plan, until the threshold is met.</p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '0.75rem' }}>For eligible accounts, we measure control-group-verified revenue over the 60 days following activation. Each campaign holds out a control group that does not receive the message; we count only conversions above what that control group's own purchase rate would predict, valued at the sent group's average order value. This nets out customers who would have purchased anyway. If that revenue is less than 3× your monthly plan cost at the day-60 mark, your account is flagged for a refund review.</p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>Refund reviews are processed manually and may take up to 10 business days. We may request reasonable verification (e.g. confirming the POS connection stayed active and campaigns were not paused or disabled by the merchant) before issuing a refund. This guarantee covers subscription fees only and does not cover credit-pack purchases.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>10. Contact</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>Questions about these terms? Email <a href="mailto:support@revoverflow.com" style={{ color: 'var(--violet-dark)' }}>support@revoverflow.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
