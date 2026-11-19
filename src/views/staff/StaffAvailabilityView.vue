<script setup lang="ts">
import { menuCategories } from '@/data/menu'
</script>

<template>
  <section class="staff-page">
    <h1 class="staff-page__title">Menu Availability</h1>
    <p class="staff-page__subtitle">
      Placeholder availability view showing {{ menuCategories.length }} menu categories. Ready for
      your Figma design and Supabase product availability toggle.
    </p>
  </section>
</template>

<style scoped>
.staff-page {
  padding: 28px;
  border: 3px dashed #e1dbc7;
  border-radius: 20px;
  background-color: #ffffff;
}

.staff-page__title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
}

.staff-page__subtitle {
  margin: 0;
  color: #6e6c65;
  font-size: 14px;
}
</style>
