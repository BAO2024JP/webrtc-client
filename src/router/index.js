import { createRouter, createWebHistory } from 'vue-router'
import RoomList from '../views/RoomList.vue'
import RoomDetail from '../views/RoomDetail.vue'
import Test from '../views/Test.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'roomlist',
      component: RoomList,
    },
    {
      path: '/room/:id',
      name: 'room',
      component: RoomDetail,
    },
    {
      path: '/test',
      name: 'test',
      component: Test,
    },
  ],
})

export default router
