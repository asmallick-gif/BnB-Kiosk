import { createRouter, createWebHistory } from 'vue-router'
import { createStaffRoutes, installStaffAuthGuard } from './staffRoutes'

const staffRouter = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...createStaffRoutes(''),
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'staff-queue' },
    },
  ],
})

installStaffAuthGuard(staffRouter)

export default staffRouter
