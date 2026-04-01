import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
// import Layout from '../components/HelloWorld.vue'

const routes: Array<RouteRecordRaw> = [
  {
    //路由初始指向
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
  {
    path: "/overview",
    name: "Overview",
    component: () => import("@/views/Overview.vue"),
  },
    {
    //路由初始指向
    path: "/3dcesium",
    name: "3Dcesium",
    component: () => import("@/views/3Dcesium.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
