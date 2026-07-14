<script setup lang="ts">
// Public page — reachable without authentication (footer links + /terms).
</script>

<template>
  <main class="legal">
    <RouterLink to="/login" class="legal-back">← Back</RouterLink>
    <h1>Terms of Service</h1>
    <p class="legal-date">Last updated: 14 July 2026</p>

    <p>
      By using this platform you agree to the terms below. This is an educational
      project of School 42 with no commercial purpose.
    </p>

    <h2>1. Account</h2>
    <p>
      You must provide a valid email address and keep your credentials
      confidential. You are responsible for activity carried out from your
      account.
    </p>

    <h2>2. Acceptable use</h2>
    <ul>
      <li>No illegal, hateful, harassing, or defamatory content.</li>
      <li>No spam, nor any attempt to gain unauthorised access to the service.</li>
      <li>Respect other students and the spirit of mutual help at 42.</li>
    </ul>

    <h2>3. User content</h2>
    <p>
      You remain responsible for the content you post. You grant the platform the
      right to display it to other users as part of the service. Content that
      clearly breaches these terms may be removed.
    </p>

    <h2>4. Anonymous identities</h2>
    <p>
      Visitors outside the 42 network see anonymised identities. Any attempt to
      de-anonymise another user is prohibited.
    </p>

    <h2>5. Privacy</h2>
    <p>
      How your data is handled is described in our
      <RouterLink to="/privacy">Privacy Policy</RouterLink>.
    </p>

    <h2>6. Suspension and termination</h2>
    <p>
      We may suspend an account that violates these terms. You can delete your
      account at any time from your profile.
    </p>

    <h2>7. Limitation of liability</h2>
    <p>
      The service is provided "as is", in an educational context, with no
      guarantee of continuous availability.
    </p>

    <h2>8. Changes</h2>
    <p>
      These terms may change; the last-updated date is shown at the top of this
      page.
    </p>
  </main>
</template>

<style scoped>
.legal {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 20px 80px;
  color: #d7d7db;
  line-height: 1.65;
  font-size: 15px;
}
.legal-back {
  display: inline-block;
  margin-bottom: 24px;
  color: #8c97f7;
  text-decoration: none;
  font-size: 14px;
}
.legal h1 {
  color: #f4f4f2;
  font-size: 28px;
  margin: 0 0 4px;
}
.legal h2 {
  color: #f4f4f2;
  font-size: 18px;
  margin: 28px 0 8px;
}
.legal-date {
  opacity: 0.55;
  font-size: 13px;
  margin: 0 0 24px;
}
.legal ul {
  padding-left: 20px;
}
.legal li {
  margin-bottom: 8px;
}
</style>
