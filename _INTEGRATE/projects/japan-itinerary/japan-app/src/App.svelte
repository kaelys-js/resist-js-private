<script lang="ts">
  import { App, View, Toolbar, Link } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { Capacitor } from '@capacitor/core';
  import routes from './routes';

  const f7params = {
    name: 'Japan 2026',
    theme: 'ios' as const,
    colors: {
      primary: '#1d3a5e',
    },
    routes,
    serviceWorker: {
      path: '/sw.js',
      scope: '/',
    },
  };

  onMount(async () => {
    if (Capacitor.isNativePlatform()) {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration: 300 });

      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
    }
  });
</script>

<App {...f7params}>
  <Toolbar tabbar icons bottom>
    <Link tabLink="#view-timeline" tabLinkActive iconF7="calendar" text="Timeline" />
    <Link tabLink="#view-bookings" iconF7="ticket" text="Bookings" />
    <Link tabLink="#view-budget" iconF7="chart_pie" text="Budget" />
    <Link tabLink="#view-checklist" iconF7="checkmark_square" text="Checklist" />
  </Toolbar>

  <View id="view-timeline" tab tabActive main url="/timeline/" />
  <View id="view-bookings" tab url="/bookings/" />
  <View id="view-budget" tab url="/budget/" />
  <View id="view-checklist" tab url="/checklist/" />
</App>
