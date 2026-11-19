import type { Router, RouteRecordRaw } from 'vue-router'
import { useStaffAuthStore } from '@/stores/staffAuth'

export function createStaffRoutes(prefix = ''): RouteRecordRaw[] {
  const normalized = prefix.replace(/\/+$/, '')
  const withPrefix = (segment: string) => `${normalized}/${segment}`.replace(/\/+/g, '/')

  return [
    {
      path: withPrefix('login'),
      name: 'staff-login',
      meta: { staffGuestOnly: true },
      component: () => import('../views/StaffLoginView.vue'),
    },
    {
      path: withPrefix('register'),
      name: 'staff-register',
      meta: { staffGuestOnly: true },
      component: () => import('../views/StaffRegisterView.vue'),
    },
    {
      path: normalized || '/',
      component: () => import('../views/staff/StaffShellView.vue'),
      meta: { requiresStaffAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'staff-queue' },
        },
        {
          path: 'queue',
          name: 'staff-queue',
          component: () => import('../views/staff/StaffQueueView.vue'),
        },
        {
          path: 'availability',
          name: 'staff-availability',
          component: () => import('../views/staff/StaffAvailabilityView.vue'),
        },
        {
          path: 'records',
          name: 'staff-records',
          component: () => import('../views/staff/StaffRecordsView.vue'),
        },
      ],
    },
  ]
}

export function installStaffAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const needsStaffAuth = to.matched.some((record) => record.meta.requiresStaffAuth)
    const guestOnly = to.matched.some((record) => record.meta.staffGuestOnly)

    if (!needsStaffAuth && !guestOnly) return true

    const authStore = useStaffAuthStore()
    await authStore.init()

    if (needsStaffAuth && !authStore.isAuthenticated) {
      return {
        name: 'staff-login',
        query: to.fullPath ? { redirect: to.fullPath } : undefined,
      }
    }

    if (guestOnly && authStore.isAuthenticated) {
      return { name: 'staff-queue' }
    }

    return true
  })
}
