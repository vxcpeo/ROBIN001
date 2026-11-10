import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import { loadConfig } from './lib/chain.js';
import './styles/terminal.css';

await loadConfig();
createApp(App).use(router).mount('#app');
