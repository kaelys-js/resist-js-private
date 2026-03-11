import { mount } from 'svelte';
import Framework7 from 'framework7/lite/bundle';
import Framework7Svelte from 'framework7-svelte';
import App from '../components/app.svelte';

import 'framework7/css/bundle';
import '../css/app.css';

Framework7.use(Framework7Svelte);

// Init Svelte App
const app = mount(App, {
  target: document.querySelector('#app'),
});

export default app;