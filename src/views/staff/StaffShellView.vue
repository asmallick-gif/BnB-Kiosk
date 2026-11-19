<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useStaffAuthStore } from '@/stores/staffAuth'
import { useStaffOrdersStore } from '@/stores/staffOrders'
import sidebarLogo from '@/assets/staff/dashboard/sidebar-logo.svg'
import ordersBadge from '@/assets/staff/dashboard/orders-badge.svg'

const router = useRouter()
const authStore = useStaffAuthStore()
const ordersStore = useStaffOrdersStore()

const showAccountModal = ref(false)
let stopWatching: (() => void) | null = null

onMounted(() => {
  stopWatching = ordersStore.startWatching()
})

onUnmounted(() => {
  stopWatching?.()
})

async function handleSignOut() {
  showAccountModal.value = false
  await authStore.logout()
  await router.replace({ name: 'staff-login' })
}
</script>

<template>
  <div class="dashboard-shell">
    <aside class="dashboard-sidebar" aria-label="Staff sidebar">
      <div class="sidebar-brand">
        <img :src="sidebarLogo" alt="Bake'n Brew" class="sidebar-brand__mark" />
        <p class="sidebar-brand__name">BAKE&lsquo;N BREW</p>
      </div>

      <nav class="sidebar-nav" aria-label="Staff sections">
        <RouterLink :to="{ name: 'staff-queue' }" class="sidebar-nav__item sidebar-nav__item--orders">
          <span class="sidebar-nav__label-wrap">
            <span class="sidebar-nav__label">Orders</span>
            <span
              v-if="ordersStore.activeCount > 0"
              class="sidebar-nav__badge"
              :aria-label="`${ordersStore.activeCount} active orders`"
            >
              <img :src="ordersBadge" alt="" aria-hidden="true" class="sidebar-nav__badge-bg" />
              <span class="sidebar-nav__badge-count">{{ ordersStore.activeCount }}</span>
            </span>
          </span>
        </RouterLink>

        <RouterLink :to="{ name: 'staff-availability' }" class="sidebar-nav__item">
          Available
        </RouterLink>

        <RouterLink :to="{ name: 'staff-records' }" class="sidebar-nav__item">Record</RouterLink>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="sidebar-action-btn" @click="showAccountModal = true">
          Account
        </button>
        <button type="button" class="sidebar-action-btn" @click="handleSignOut">Log Out</button>
      </div>
    </aside>

    <div class="dashboard-main">
      <RouterView />
    </div>

    <div
      v-if="showAccountModal"
      class="account-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-account-title"
      @click.self="showAccountModal = false"
    >
      <div class="account-dialog">
        <h2 id="staff-account-title" class="account-dialog__title">Staff Account</h2>
        <p class="account-dialog__name">{{ authStore.user?.fullName }}</p>
        <p class="account-dialog__email">{{ authStore.user?.email }}</p>
        <p v-if="authStore.isLocalDemo" class="account-dialog__demo">
          Local preview mode (Supabase not configured)
        </p>
        <div class="account-dialog__actions">
          <button
            type="button"
            class="account-dialog__btn account-dialog__btn--secondary"
            @click="showAccountModal = false"
          >
            Close
          </button>
          <button
            type="button"
            class="account-dialog__btn account-dialog__btn--primary"
            @click="handleSignOut"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-shell {
  display: flex;
  min-height: 100dvh;
  width: 100%;
  background-color: #f8f8f6;
  color: #000000;
}

.dashboard-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  width: 162px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #5d7706;
  padding: 17px 0 20px;
  overflow-y: auto;
}

.sidebar-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6.5px;
  width: 137.165px;
  margin: 0 auto;
}

.sidebar-brand__mark {
  display: block;
  width: 137.165px;
  height: 59.806px;
}

.sidebar-brand__name {
  margin: 0;
  width: 100%;
  color: #f9f3dd;
  font-size: 15.602px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.56px;
  text-align: center;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 40px;
  width: 100%;
}

.sidebar-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 51px;
  color: #f9f3dd;
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 2px;
  text-decoration: none;
  transition: background-color 140ms ease;
}

.sidebar-nav__item--orders {
  letter-spacing: 0;
}

.sidebar-nav__item:hover {
  background-color: rgba(64, 89, 9, 0.55);
}

.sidebar-nav__item.router-link-active {
  background-color: #405909;
}

.sidebar-nav__label-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.sidebar-nav__label {
  font-weight: 700;
}

.sidebar-nav__badge {
  position: absolute;
  top: -6px;
  right: -18px;
  width: 15px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sidebar-nav__badge-bg {
  position: absolute;
  inset: 0;
  width: 15px;
  height: 14px;
  mix-blend-mode: lighten;
}

.sidebar-nav__badge-count {
  position: relative;
  z-index: 1;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 1px;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: auto;
  padding: 20px 6px 0;
}

.sidebar-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 51px;
  border: 2px solid #f9f3dd;
  background-color: transparent;
  color: #f9f3dd;
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.sidebar-action-btn:hover {
  background-color: #f9f3dd;
  color: #405909;
}

.sidebar-action-btn:focus-visible,
.sidebar-nav__item:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

.dashboard-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f6;
}

.account-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(19, 21, 8, 0.45);
}

.account-dialog {
  width: min(340px, 100%);
  padding: 24px;
  border: 3px dashed #e1dbc7;
  border-radius: 20px;
  background-color: #ffffff;
  text-align: center;
}

.account-dialog__title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.account-dialog__name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.account-dialog__email {
  margin: 4px 0 0;
  font-size: 13px;
  color: #5d7706;
}

.account-dialog__demo {
  margin: 12px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  background-color: #f9f3dd;
  color: #6e6c65;
  font-size: 11px;
}

.account-dialog__actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.account-dialog__btn {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.account-dialog__btn--secondary {
  border: 1px solid #898781;
  background-color: #ffffff;
  color: #000000;
}

.account-dialog__btn--primary {
  border: 0;
  background-color: #5d7706;
  color: #ffffff;
}

@media (max-width: 720px) {
  .dashboard-shell {
    flex-direction: column;
  }

  .dashboard-sidebar {
    position: static;
    height: auto;
    width: 100%;
    padding: 12px 16px;
  }

  .sidebar-nav {
    flex-direction: row;
    margin-top: 12px;
    gap: 8px;
  }

  .sidebar-nav__item {
    height: 40px;
    font-size: 15px;
    border-radius: 8px;
  }

  .sidebar-footer {
    flex-direction: row;
    padding: 12px 0 0;
  }

  .sidebar-action-btn {
    flex: 1;
    width: auto;
    height: 38px;
    font-size: 15px;
  }
}
</style>
