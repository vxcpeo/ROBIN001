import { createRouter, createWebHistory } from 'vue-router';
import LandingView from './views/LandingView.vue';
import DappView from './views/DappView.vue';
import TransparencyView from './views/TransparencyView.vue';

const routes = [
  { path: '/', name: 'home', component: LandingView, meta: { title: 'Receiva · Put a hood on your wallet' } },
  { path: '/receive', name: 'receive', component: DappView, meta: { title: 'Receiva App · Private receive links on Robinhood Chain' } },
  { path: '/send', name: 'send', component: DappView, meta: { title: 'Receiva App · Private receive links on Robinhood Chain' } },
  { path: '/inbox', name: 'inbox', component: DappView, meta: { title: 'Receiva App · Private receive links on Robinhood Chain' } },
  { path: '/pay/:recipient', name: 'pay', component: DappView, meta: { title: 'Receiva App · Private receive links on Robinhood Chain' } },
  { path: '/transparency', name: 'transparency', component: TransparencyView, meta: { title: 'Transparency · Receiva' } },
  { path: '/app', redirect: '/receive' },
  { path: '/app/', redirect: '/receive' },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title;
});

export default router;
