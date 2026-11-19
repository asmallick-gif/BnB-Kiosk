import type { Router } from 'vue-router'
import { createStaffRoutes, installStaffAuthGuard } from './staffRoutes'

export function mountDevStaffRoutes(router: Router): void {
  for (const route of createStaffRoutes('/staff')) {
    router.addRoute(route)
  }
  installStaffAuthGuard(router)
}
