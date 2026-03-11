<script>
  import { App, Panel, View } from "framework7-svelte";
  // eslint-disable-next-line
  import routes from "../routes.js";
  // eslint-disable-next-line
  import store from "../store.js";
  import { onMount } from "svelte";

  // Demo Theme
  let theme = "ios";

  const needsBrowserHistory =
    document.location.href.includes("example-preview");

  const f7Params = {
    theme,
    routes,
    store,
    popup: {
      closeOnEscape: true,
    },
    sheet: {
      closeOnEscape: true,
    },
    popover: {
      closeOnEscape: true,
    },
    actions: {
      closeOnEscape: true,
    },
  };
  /**
   * When true, the animated mascot layer can be mounted
   * after the static splash has rendered.
   */
  export let showAnimation = false;

  let ready = false;

  // Call this when app is ready (data + router)
  export function finishSplash() {
    ready = true;
  }

  onMount(async () => {
    //await appReady(); // data + router
    requestAnimationFrame(() => {
      setTimeout(() => {
        //finishSplash();
      }, 1000);
    });
  });
</script>

<App {...f7Params}>
  <div class="splash-root" class:exit={ready}>
    <!-- Static splash (must be acceptable alone) -->
    <div class="splash-content">
      <div class="mascot-wrapper">
        <img
          src="../assets/mascot-static.png"
          alt="Tastier mascot"
          class="mascot"
          draggable="false"
        />
      </div>

      <div class="brand">
        <div class="logo-text">Tastier</div>
        <div class="tagline">
          <div>Recipes that fit your life.</div>
          <div class="sub">Your budget, your pantry, your time.</div>
        </div>
      </div>
    </div>

    <!-- Animation mount point (initially hidden) -->
    {#if showAnimation}
      <div class="mascot-animation-layer">
        <!-- Animated mascot component mounts here -->
        <slot name="animation" />
      </div>
    {/if}
  </div>

  <div class="home">TEST</div>

  <style>
    /* ---------------- FONT ---------------- */

    @font-face {
      font-family: "TastierRounded";
      src: url("../assets/Nunito-VariableFont_wght.ttf") format("truetype");
      font-weight: 200 900;
      font-style: normal;
      font-display: swap;
    }

    :root {
      --font-rounded: "TastierRounded";
    }

    /* ---------------- BASE ---------------- */

    :global(html),
    :global(body),
    :global(#app) {
      height: 100%;
      margin: 0;
      background: #f6efe6;
      font-family:
        ui-rounded,
        var(--font-rounded),
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        Arial,
        sans-serif;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* ---------------- SPLASH LAYER ---------------- */

    .splash-root {
  position: fixed;
  inset: 0;
  z-index: 9999;

  /* Base color only */
  background-color: #f6efe6;

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  /* Start state */
  transform: scale(1);
  opacity: 1;

  transition:
    transform 680ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 420ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Linen texture layer (CORRECT opacity handling) */
.splash-root::before {
  content: "";
  position: absolute;
  inset: 0;

  background-image: url("../assets/linen.png");
  background-repeat: repeat;
  background-size: 1024px 1024px; /* native tile size */
  background-position: top left;

  opacity: 0.35;
  pointer-events: none;
}

/* Noise overlay */
.splash-root::after {
  content: "";
  position: absolute;
  inset: 0;

  background-image: url("../assets/noise.png");
  background-repeat: repeat;
  background-size: 1024px 1024px;
  opacity: 0.05;

  pointer-events: none;
}

    @media (color-gamut: p3) {
  :root {
    background-color: #f6efe6;
  }
}

    /* EXIT STATE — THIS IS THE INSTACART MAGIC */
    .splash-root.exit {
      pointer-events: none;

      /* subtle growth + fade */
      transform: scale(1.045);
      opacity: 0;
    }

    /* ---------------- SPLASH CONTENT ---------------- */

    .splash-content {
      position: relative;
      width: 100%;
      max-width: 480px;
      padding: env(safe-area-inset-top) env(safe-area-inset-right)
        env(safe-area-inset-bottom) env(safe-area-inset-left);

      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;

      transition:
        transform 560ms cubic-bezier(0.22, 0.61, 0.36, 1),
        opacity 360ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    /* Let content yield slightly upward */
    .splash-root.exit .splash-content {
      transform: translateY(-8px)
      opacity: 0;
    }

    /* ---------------- MASCOT ---------------- */

    .mascot-wrapper {
      margin-top: 12vh;
      margin-bottom: 24px;
    }

    .mascot {
      width: min(160px, 40vw);
      height: auto;
      user-select: none;
      pointer-events: none;

      filter:
    saturate(0.98)
    brightness(0.99)
    contrast(1.01);
      transition:
    transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 400ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    .splash-root.exit .mascot {
      transform: scale(0.93) translateY(-6px);
      opacity: 0;
    }


.mascot-wrapper::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("../assets/noise.png");
  background-repeat: repeat;
  background-size: 1024px 1024px;
  opacity: 0.05;
  mix-blend-mode: multiply;
  pointer-events: none;
}

    /* ---------------- BRAND ---------------- */

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .logo-text {
      font-size: clamp(36px, 8vw, 44px);
      font-weight: 800;
      color: #6B4A33;
      letter-spacing: -0.02em;
    }

    .tagline {
      font-size: clamp(15px, 3.8vw, 17px);
      color: #7a6a5e;
      line-height: 1.45;
    }

    .tagline .sub {
      margin-top: 4px;
    }

    /* ---------------- HOME ---------------- */

    .home {
      position: fixed;
      inset: 0;
      z-index: 1;

      background-color: #f6efe6;
      background-image: url("../assets/linen.png");
      background-repeat: repeat;
background-size: 1024px 1024px; /* MUST be native tile size */
background-position: top left;

      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      /* visible underneath splash */
      opacity: 0;
      transform: translateY(6px);

      transition:
        opacity 260ms cubic-bezier(0.25, 0.8, 0.25, 1),
        transform 260ms cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    /* Reveal home as splash exits */
    .splash-root.exit + .home {
      opacity: 1;
      transform: translateY(0);
    }

    /* ---------------- REDUCED MOTION ---------------- */

    @media (prefers-reduced-motion: reduce) {
      .splash-root,
      .splash-content,
      .mascot,
      .home {
        transition: none !important;
      }

      .splash-root.exit {
        opacity: 0;
        transform: none;
      }

      .home {
        opacity: 1;
        transform: none;
      }
    }
  </style>
</App>
