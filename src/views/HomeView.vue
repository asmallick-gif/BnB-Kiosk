<script setup lang="ts">
import { useRouter } from 'vue-router'
import background from '@/assets/images/welcome-background.jpg'
import logo from '@/assets/logos/bnb-logo.svg'
const router = useRouter()
</script>

<template>
  <main class="welcome-screen" :style="{ backgroundImage: `url(${background})` }">
    <header class="welcome-header">
      <h1>Stronger days<br />start here</h1>
    </header>

    <div class="order-region">
      <section class="order-panel" aria-labelledby="order-prompt">
        <h2 id="order-prompt">Tap an option to start ordering</h2>
        <div class="order-options">
          <button
            type="button"
            class="order-button order-button--takeout"
            @click="router.push({ name: 'menu', query: { type: 'take-out' } })"
          >
            Take-out
          </button>
          <button
            type="button"
            class="order-button order-button--dinein"
            @click="router.push({ name: 'menu', query: { type: 'dine-in' } })"
          >
            Dine-in
          </button>
        </div>
      </section>
    </div>

    <footer class="welcome-footer">
      <img :src="logo" alt="Bake'n Brew" class="brand-logo" width="183" height="114" />
    </footer>
  </main>
</template>

<style scoped>
.welcome-screen {
  --cream: #f9f3dd;
  --olive: #617900;
  --screen-gutter: 7vw;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: clamp(32px, 8dvh, 160px);
  min-height: 100dvh;
  padding: max(20px, 1.5dvh, env(safe-area-inset-top)) var(--screen-gutter)
    max(24px, 4dvh, env(safe-area-inset-bottom));
  background-color: #504631;
  background-size: cover;
  background-position: center;
  color: var(--cream);
}

.welcome-header {
  margin-right: -5vw;
  text-align: right;
}

.welcome-header h1 {
  margin: 0;
  font-size: clamp(52px, 6.1vw, 96px);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.order-region {
  grid-row: 3;
  position: relative;
  isolation: isolate;
  display: grid;
  margin-inline: calc(-1 * var(--screen-gutter));
  padding-inline: var(--screen-gutter);
}

/* Full-width shaded band, separate from the translucent ordering panel. */
.order-region::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -5dvh 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 0, 0, 0.52) 14%,
    rgb(0 0 0 / 52%) 86%,
    transparent
  );
}

.order-panel {
  width: 100%;
  max-width: 1500px;
  justify-self: center;
  padding: clamp(28px, 4.2dvh, 110px) clamp(20px, 8.5vw, 160px) clamp(36px, 6dvh, 160px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: clamp(24px, 4.5vw, 80px);
  background: rgba(240, 238, 238, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(1.2px);
  -webkit-backdrop-filter: blur(6.2px);
  text-align: center;
}

.order-panel h2 {
  margin: 0 0 clamp(28px, 4dvh, 140px);
  color: #fff;
  font-size: clamp(28px, 3.8vw, 140px);
  font-weight: 400;
  line-height: 1.35;
  text-wrap: balance;
}

.order-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 3vw, 56px);
}

.order-button {
  min-height: 64px;
  padding: clamp(20px, 2dvh, 48px) 12px;
  border: 2px solid transparent;
  border-radius: clamp(16px, 2.3vw, 40px);
  font: inherit;
  font-size: clamp(24px, 3.6vw, 60px);
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.order-button--takeout {
  background: #fffde0;
  color: #131508;
}

.order-button--dinein {
  background: var(--olive);
  color: #fff;
}

@media (hover: hover) {
  .order-button--takeout:hover {
    background: #eee8c7;
  }
  .order-button--dinein:hover {
    background: #4e6200;
  }
}

.order-button:active {
  transform: scale(0.98);
}
.order-button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 6px;
}

.welcome-footer {
  grid-row: 4;
  display: flex;
  justify-content: center;
}

.brand-logo {
  display: block;
  width: clamp(112px, 18vw, 300px);
  height: auto;
}

/* Portrait tablets: keep the choices side by side and within thumb reach. */
@media (orientation: portrait) and (min-width: 481px) {
  .welcome-screen {
    gap: clamp(32px, 6dvh, 120px);
  }
  .order-button {
    min-height: 80px;
  }
}

@media (orientation: landscape) {
  .welcome-screen {
    gap: 32px;
  }
  .welcome-header h1 {
    font-size: clamp(28px, 7dvh, 72px);
  }
  .order-panel {
    max-width: 880px;
    padding: 32px 48px;
  }
  .order-panel h2 {
    font-size: clamp(24px, 3vw, 40px);
    margin-bottom: 28px;
  }
  .order-button {
    font-size: clamp(24px, 3vw, 36px);
  }
  .brand-logo {
    width: 112px;
  }
}

@media (max-width: 480px) {
  .welcome-screen {
    --screen-gutter: 6vw;
  }
  .welcome-header {
    margin-right: -3vw;
  }
  .welcome-header h1 {
    font-size: clamp(24px, 6.1vw, 29px);
  }
  .order-panel {
    padding-inline: 18px;
  }
  .order-button {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .order-button {
    transition: none;
  }
}
</style>
