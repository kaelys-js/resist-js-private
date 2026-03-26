import Framework7 from 'framework7/lite-bundle';
import Framework7Svelte from 'framework7-svelte';

import 'framework7/css/bundle';
import './css/app.css';
import './css/cities.css';

Framework7.use(Framework7Svelte);

import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
