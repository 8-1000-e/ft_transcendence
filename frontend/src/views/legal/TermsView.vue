<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
</script>

<template>
  <LegalPage :title="$t('legal.terms.title')" :updated="$t('legal.terms.updated')">
    <h2>{{ $t('legal.terms.aboutTitle') }}</h2>
    <p>{{ $t('legal.terms.aboutBody') }}</p>

    <h2>{{ $t('legal.terms.accountTitle') }}</h2>
    <ul>
      <li>{{ $t('legal.terms.accountEmail') }}</li>
      <li>{{ $t('legal.terms.accountSecure') }}</li>
      <li>{{ $t('legal.terms.accountOne') }}</li>
    </ul>

    <h2>{{ $t('legal.terms.contentTitle') }}</h2>
    <p>{{ $t('legal.terms.contentBody') }}</p>

    <h2>{{ $t('legal.terms.respectTitle') }}</h2>
    <p v-html="$t('legal.terms.respectBody')"></p>

    <h2>{{ $t('legal.terms.deleteTitle') }}</h2>
    <p>{{ $t('legal.terms.deleteBody') }}</p>

    <h2>{{ $t('legal.terms.changesTitle') }}</h2>
    <p>{{ $t('legal.terms.changesBody') }}</p>

    <h2>{{ $t('legal.terms.contactTitle') }}</h2>
    <p v-html="$t('legal.terms.contactBody')"></p>
  </LegalPage>
</template>
