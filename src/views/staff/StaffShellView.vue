<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useStaffAuthStore } from '@/stores/staffAuth'
import bnbMark from '@/assets/staff/bnb-mark.svg'

const router = useRouter()
const authStore = useStaffAuthStore()

async function handleSignOut() {
  await authStore.logout()
  await router.replace({ name: 'staff-login' })
}
</script>

<template>
  <div class="staff-shell">
    <header class="staff-shell__topbar">
      <div class="staff-shell__brand">
        <span class="staff-shell__logo-pill">
          <img :src="bnbMark" alt="Bake'n Brew" class="staff-shell__logo-mark" />
        </span>
        <div>
          <p class="staff-shell__brand-title">Bake&rsquo;n Brew Staff Portal</p>
          <p v-if="authStore.isLocalDemo" class="staff-shell__demo-badge">
            Local preview mode (Supabase not configured)
          </p>
        </div>
      </div>

      <nav class="staff-shell__nav" aria-label="Staff navigation">
        <RouterLink :to="{ name: 'staff-queue' }" class="staff-shell__nav-link">Queue</RouterLink>
        <RouterLink :to="{ name: 'staff-availability' }" class="staff-shell__nav-link">
          Availability
        </RouterLink>
        <RouterLink :to="{ name: 'staff-records' }" class="staff-shell__nav-link">
          Records
        </RouterLink>
      </nav>

      <div class="staff-shell__account">
        <div class="staff-shell__user">
          <span class="staff-shell__user-name">{{ authStore.user?.fullName }}</span>
          <span class="staff-shell__user-email">{{ authStore.user?.email }}</span>
        </div>
        <button type="button" class="staff-shell__signout" @click="handleSignOut">Sign out</button>
      </div>
    </header>

    <main class="staff-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.staff-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #f9f3dd;
  color: #131508;
}

.staff-shell__topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 28px;
  background-color: #ffffff;
  border-bottom: 2px dashed #e1dbc7;
}

.staff-shell__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.staff-shell__logo-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background-color: #5d7706;
  padding: 8px;
}

.staff-shell__logo-mark {
  display: block;
  width: 36px;
  height: auto;
}

.staff-shell__brand-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.staff-shell__demo-badge {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8f571a;
}

.staff-shell__nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.staff-shell__nav-link {
  padding: 8px 16px;
  border-radius: 10px;
  color: #3d3c36;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.staff-shell__nav-link:hover {
  background-color: #f3ecce;
}

.staff-shell__nav-link.router-link-active {
  background-color: #5d7706;
  color: #ffffff;
}

.staff-shell__account {
  display: flex;
  align-items: center;
  gap: 14px;
}

.staff-shell__user {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.staff-shell__user-name {
  font-size: 13px;
  font-weight: 700;
}

.staff-shell__user-email {
  font-size: 11px;
  color: #6e6c65;
}

.staff-shell__signout {
  padding: 8px 14px;
  border: 1px solid #c77824;
  border-radius: 10px;
  background-color: #ffffff;
  color: #8f571a;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.staff-shell__signout:hover {
  background-color: #c77824;
  color: #ffffff;
}

.staff-shell__content {
  flex: 1;
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 28px 24px 48px;
}
</style>
