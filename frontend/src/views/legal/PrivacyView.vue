<script setup lang="ts">
// Public page — reachable without authentication (footer links + /privacy).
</script>

<template>
  <main class="legal">
    <RouterLink to="/login" class="legal-back">← Back</RouterLink>
    <h1>Privacy Policy</h1>
    <p class="legal-date">Last updated: 14 July 2026</p>

    <p>
      This platform is an educational project of School 42, intended for students
      of the same campus. We limit data collection to what is strictly necessary
      for the service to work.
    </p>

    <h2>1. Data we collect</h2>
    <ul>
      <li>
        <strong>Account:</strong> email address, display name, and password
        (stored only as a <em>bcrypt</em> hash, never in clear text).
      </li>
      <li>
        <strong>42 data (opt-in):</strong> if — and only if — you log in through
        42, we store your 42 identifier, campus, and profile picture. No data of a
        42 student who has not consented is stored or ranked.
      </li>
      <li>
        <strong>Content:</strong> posts, comments, replies, votes, messages, and
        files you create on the platform.
      </li>
      <li>
        <strong>Technical:</strong> authentication tokens (JWT) required to keep
        your session active.
      </li>
    </ul>

    <h2>2. Purpose and legal basis</h2>
    <p>
      This data is used solely to provide the service (authentication, forum,
      messaging, mentor suggestions). The legal basis is your
      <strong>explicit consent</strong> and the performance of the service, in
      compliance with the GDPR and the 42 API terms of use (an
      <em>opt-in</em> model).
    </p>

    <h2>3. Retention and deletion</h2>
    <p>
      You can request deletion of your account at any time. Deletion is scheduled
      with a 14-day grace period; after that, your personal data is irreversibly
      anonymised (your contributions remain visible under the
      <code>[DELETED_USER]</code> label).
    </p>

    <h2>4. Your rights</h2>
    <p>
      Under the GDPR you have the right to access, rectify, erase, and port your
      data, and to withdraw consent. Most of these actions are available directly
      from your profile.
    </p>

    <h2>5. Sharing</h2>
    <p>
      Your data is never sold nor shared with third parties, and stays within the
      42 network in accordance with the 42 API terms.
    </p>

    <h2>6. Contact</h2>
    <p>For any question about your data, contact the project team.</p>
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
.legal code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
