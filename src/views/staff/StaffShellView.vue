<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useStaffAuthStore } from '@/stores/staffAuth'
import { useStaffOrdersStore } from '@/stores/staffOrders'
import sidebarLogo from '@/assets/staff/dashboard/sidebar-logo.svg'
import ordersBadge from '@/assets/staff/dashboard/orders-badge.svg'

const router = useRouter()
const authStore = useStaffAuthStore()
const ordersStore = useStaffOrdersStore()

let stopWatching: (() => void) | null = null

onMounted(() => {
  stopWatching = ordersStore.startWatching()
})

onUnmounted(() => {
  stopWatching?.()
})

async function handleSignOut() {
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
        <RouterLink :to="{ name: 'staff-account' }" class="sidebar-action-btn">Account</RouterLink>
        <button type="button" class="sidebar-action-btn" @click="handleSignOut">Log Out</button>
      </div>
    </aside>

    <div class="dashboard-main">
      <RouterView />
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
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.sidebar-action-btn:hover,
.sidebar-action-btn.router-link-active {
  background-color: #f9f3dd;
  color: #5d7706;
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
