<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
</script>

<template>
  <LegalPage :title="$t('legal.privacy.title')" :updated="$t('legal.privacy.updated')">
    <h2>{{ $t('legal.privacy.whoTitle') }}</h2>
    <p>{{ $t('legal.privacy.whoBody') }}</p>

    <h2>{{ $t('legal.privacy.collectTitle') }}</h2>
    <ul>
      <li v-html="$t('legal.privacy.collectAccount')"></li>
      <li v-html="$t('legal.privacy.collectContent')"></li>
      <li v-html="$t('legal.privacy.collectSession')"></li>
    </ul>

    <h2>{{ $t('legal.privacy.optinTitle') }}</h2>
    <p v-html="$t('legal.privacy.optinBody')"></p>

    <h2>{{ $t('legal.privacy.identityTitle') }}</h2>
    <p v-html="$t('legal.privacy.identityBody')"></p>

    <h2>{{ $t('legal.privacy.deletionTitle') }}</h2>
    <p v-html="$t('legal.privacy.deletionBody')"></p>

    <h2>{{ $t('legal.privacy.rightsTitle') }}</h2>
    <p>{{ $t('legal.privacy.rightsBody') }}</p>

    <h2>{{ $t('legal.privacy.contactTitle') }}</h2>
    <p v-html="$t('legal.privacy.contactBody')"></p>
  </LegalPage>
</template>
