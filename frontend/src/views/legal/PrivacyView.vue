<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
</script>

<template>
  <LegalPage title="Privacy Policy" updated="July 2026">
    <h2>Who we are</h2>
    <p>
      ft_hub is a student project built at 42 — a place for students to discuss
      projects, ask questions, and connect around coursework. This page explains
      what personal data we collect, why, and the rights you have over it.
    </p>

    <h2>Data we collect</h2>
    <ul>
      <li><strong>Account data</strong> — the email address and display name you sign up with, plus a securely hashed password. Email/password is the required way to log in.</li>
      <li><strong>Content you create</strong> — the posts, comments, replies, and group messages you write, along with their timestamps and vote counts.</li>
      <li><strong>Session data</strong> — authentication tokens kept in your browser so you stay logged in.</li>
    </ul>

    <h2>42 accounts are opt-in</h2>
    <p>
      Logging in with 42 is entirely optional. We only import and use data from
      the 42 API — your login, campus, and profile picture — <strong>for the 42
      users who have chosen to sign in through 42</strong>. We never store, rank,
      display, or otherwise process the data of 42 students who have not opted in.
      This follows the 42 API terms of use and the GDPR principle of consent.
    </p>

    <h2>How your identity is shown</h2>
    <p>
      To respect the choice above, your real 42 identity (name, campus, profile
      picture) is only revealed to other <strong>signed-in 42 users</strong>.
      Viewers who are not authenticated 42 users see an <strong>anonymous</strong>
      identity instead of your personal details.
    </p>

    <h2>Deletion and anonymisation</h2>
    <p>
      You can delete your account at any time from your profile. Deletion is a
      <strong>14-day soft-delete</strong>: your account is immediately disabled,
      and you can cancel and restore it at any point during that grace period. If
      you do not cancel, the account is permanently removed. Content you left
      behind (posts, comments, messages) is <strong>anonymised</strong> — detached
      from your identity — rather than shown under your name.
    </p>

    <h2>Your rights (GDPR)</h2>
    <p>
      You have the right to access, correct, export, and erase your personal
      data, and to withdraw consent for 42 data processing by removing the 42
      link or deleting your account. To exercise any of these rights, contact us
      below.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about your data? Reach the ft_hub team at
      <a href="mailto:privacy@ft-hub.example">privacy@ft-hub.example</a>.
    </p>
  </LegalPage>
</template>
