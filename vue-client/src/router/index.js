import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView, // 기본 경로에 HomeView 설정
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
