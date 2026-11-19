<script setup lang="ts">
import staffHero from '@/assets/staff/staff-hero.png'
import bgEllipse16 from '@/assets/staff/bg-ellipse-16.svg'
import bgEllipse17 from '@/assets/staff/bg-ellipse-17.svg'
import bgEllipse18 from '@/assets/staff/bg-ellipse-18.svg'
import logoBadgeCircle from '@/assets/staff/logo-badge-circle.svg'
import bnbMark from '@/assets/staff/bnb-mark.svg'

defineProps<{
  title: string
}>()
</script>

<template>
  <main class="staff-auth-page">
    <div class="staff-auth-pattern" aria-hidden="true">
      <div class="pattern-layer pattern-layer--16">
        <div class="pattern-rotate pattern-rotate--16">
          <img :src="bgEllipse16" alt="" width="1971" height="1892" class="pattern-svg" />
        </div>
      </div>
      <div class="pattern-layer pattern-layer--17">
        <div class="pattern-rotate pattern-rotate--17">
          <img :src="bgEllipse17" alt="" class="pattern-svg pattern-svg--large" />
        </div>
      </div>
      <div class="pattern-layer pattern-layer--18">
        <div class="pattern-rotate pattern-rotate--18">
          <img :src="bgEllipse18" alt="" class="pattern-svg pattern-svg--large" />
        </div>
      </div>
    </div>

    <section class="staff-auth-left" aria-labelledby="staff-auth-heading">
      <div class="staff-auth-card-shell">
        <div class="staff-auth-badge" aria-label="Bake'n Brew">
          <img
            :src="logoBadgeCircle"
            alt=""
            aria-hidden="true"
            width="178"
            height="178"
            class="staff-auth-badge-circle"
          />
          <div class="staff-auth-logo">
            <img :src="bnbMark" alt="Bake'n Brew" class="staff-auth-logo-mark" />
            <p class="staff-auth-logo-text">BAKE&lsquo;N BREW</p>
          </div>
        </div>

        <div class="staff-auth-card">
          <h1 id="staff-auth-heading" class="staff-auth-heading">{{ title }}</h1>
          <slot />
        </div>
      </div>
    </section>

    <aside class="staff-auth-right" aria-hidden="true">
      <img :src="staffHero" alt="" class="staff-auth-hero" />
    </aside>
  </main>
</template>

<style scoped>
.staff-auth-page {
  --staff-cream: #f9f3dd;
  --staff-card-border: #e1dbc7;
  --staff-input-border: #898781;
  --staff-placeholder: #6e6c65;
  --staff-olive: #5d7706;
  --staff-olive-shadow: #124702;
  --staff-amber: #c77824;
  --staff-amber-shadow: #8f571a;
  --staff-deep-green: #0c3201;

  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 100dvh;
  width: 100%;
  background-color: var(--staff-cream);
  color: #000000;
  overflow: hidden;
  isolation: isolate;
}

.staff-auth-pattern {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.pattern-layer {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pattern-layer--16 {
  left: -918.72px;
  top: -527.43px;
  width: 2472.45px;
  height: 2422.854px;
}

.pattern-layer--17 {
  left: -900px;
  top: -633px;
  width: 2872.45px;
  height: 2807.849px;
}

.pattern-layer--18 {
  left: -1325px;
  top: -677px;
  width: 3069.548px;
  height: 3102.72px;
}

.pattern-rotate {
  flex: none;
}

.pattern-rotate--16 {
  transform: rotate(-18.65deg);
}

.pattern-rotate--17 {
  transform: rotate(-161.35deg) scaleY(-1);
}

.pattern-rotate--18 {
  transform: rotate(-58.18deg) scaleY(-1);
}

.pattern-svg {
  display: block;
  max-width: none;
}

.pattern-svg--large {
  width: 2292.68px;
  height: 2189.78px;
}

.staff-auth-left {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 24px 48px;
}

.staff-auth-card-shell {
  position: relative;
  width: min(379px, 100%);
}

.staff-auth-badge {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 160px;
  z-index: 2;
  pointer-events: none;
}

.staff-auth-badge-circle {
  position: absolute;
  top: -9px;
  left: -9px;
  width: 178px;
  height: 178px;
  max-width: none;
  display: block;
}

.staff-auth-logo {
  position: absolute;
  top: 39px;
  left: 50%;
  transform: translateX(-50%);
  width: 134.165px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6.358px;
}

.staff-auth-logo-mark {
  display: block;
  width: 134.165px;
  height: 58.498px;
  flex-shrink: 0;
}

.staff-auth-logo-text {
  margin: 0;
  width: 100%;
  color: #ffffff;
  font-size: 15.26px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 1.526px;
  text-align: center;
}

.staff-auth-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 619px;
  padding: 96px 16px 48px;
  background-color: #ffffff;
  border: 4px dashed var(--staff-card-border);
  border-radius: 30px;
}

.staff-auth-heading {
  margin: 0 0 22px;
  color: #000000;
  font-size: 24px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: 2.4px;
  text-align: center;
}

.staff-auth-right {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  overflow: hidden;
  background-color: #21160d;
}

.staff-auth-hero {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 58.6% center;
}

@media (max-width: 860px) {
  .staff-auth-page {
    grid-template-columns: 1fr;
  }

  .staff-auth-right {
    display: none;
  }
}

@media (max-width: 440px) {
  .staff-auth-left {
    padding: 92px 16px 32px;
  }

  .staff-auth-card {
    padding: 92px 22px 36px;
    min-height: 560px;
  }

  .staff-auth-heading {
    font-size: 21px;
    letter-spacing: 1.8px;
  }
}
</style>
