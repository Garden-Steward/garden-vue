<script setup>
// The cream title band public pages open with: small eyebrow, big serif title,
// optional one- or two-line intro in the default slot.
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  // Match the width of the page's content below so the text lines up.
  width: { type: String, default: '960px' },
});
</script>

<template>
  <header class="page-head">
    <div class="page-head-wrap" :style="{ maxWidth: width }">
      <p v-if="eyebrow" class="page-head-eyebrow">{{ eyebrow }}</p>
      <h1 class="page-head-title">{{ title }}</h1>
      <div v-if="$slots.default" class="page-head-sub"><slot /></div>
    </div>
  </header>
</template>

<style>
.page-head {
  padding: 48px 0 36px;
  background-color: #f7f1e3;
  border-bottom: 1px solid #e0d6c4;
  font-family: Roboto, system-ui, sans-serif;
}

.dark .page-head {
  background-color: #344a34;
  border-bottom-color: #3d4d36;
}

.page-head-wrap {
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 24px;
}

.page-head-eyebrow {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #064e3b;
}

.dark .page-head-eyebrow {
  color: #c5d4b8;
}

.page-head-title {
  margin: 8px 0 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1.1;
  color: #064e3b;
}

.dark .page-head-title {
  color: #f5f5f5;
}

.page-head-sub {
  max-width: 56ch;
  margin-top: 10px;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: #4b5563;
}

.page-head-sub p {
  margin: 0;
}

.dark .page-head-sub {
  color: #d0d0d0;
}

@media (max-width: 720px) {
  .page-head {
    padding: 32px 0 24px;
  }

  .page-head-wrap {
    padding: 0 16px;
  }
}
</style>
