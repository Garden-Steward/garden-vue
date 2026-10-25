<script setup>
import ManageLayout from '@/components/ManageLayout.vue';
</script>

<template>
  <ManageLayout>
    <main class="newsletter-page">
      <header class="newsletter-page__intro">
        <p class="newsletter-page__eyebrow">From the garden</p>
        <h1>Newsletter</h1>
        <p>Garden stories, project updates, and a reason to get outside.</p>
      </header>

      <section class="newsletter-page__subscribe" aria-labelledby="newsletter-heading">
        <div>
          <h2 id="newsletter-heading">A little care,<br>close to home.</h2>
          <p>Seasonal notes from Garden Steward, straight to your inbox.</p>
        </div>
        <div class="newsletter-page__choice">
          <a class="newsletter-page__join" href="https://garden-steward.beehiiv.com/subscribe" target="_blank" rel="noopener noreferrer">Join the newsletter ↗</a>
          <p>Email updates are optional. You can take part in the garden without subscribing.</p>
          <p class="newsletter-page__fine">Unsubscribe any time.</p>
        </div>
      </section>

      <section class="newsletter-page__stories" aria-labelledby="stories-heading">
        <div>
          <h2 id="stories-heading">Stories from the garden</h2>
          <p>Read how neighbors are growing food, sharing what they know, and caring for the places around them.</p>
        </div>
        <router-link to="/blog">Read garden stories ↗</router-link>
      </section>

      <p class="newsletter-page__invitation">Ready to join in? <router-link to="/schedule">Find your next gathering ↗</router-link></p>
    </main>
  </ManageLayout>
</template>

<style scoped>
.newsletter-page { min-height: 65vh; color: var(--gs-ink); font: 18px/1.6 var(--gs-body-font); }
.newsletter-page__intro { margin-bottom: 42px; }
.newsletter-page__eyebrow { margin: 0 0 18px; color: var(--gs-muted); font-size: 14px; letter-spacing: .14em; text-transform: uppercase; }
.newsletter-page h1, .newsletter-page h2 { font-family: var(--gs-heading-font); font-weight: 400; }
.newsletter-page h1 { margin: 0 0 18px; font-size: clamp(44px, 4.8vw, 76px); line-height: 1.08; letter-spacing: -.035em; }
.newsletter-page__intro > p:last-child { margin: 0; font-size: clamp(18px, 1.4vw, 23px); }
.newsletter-page__subscribe { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 44px; padding: 38px 0; border-top: 1px solid var(--gs-rule); border-bottom: 1px solid var(--gs-rule); }
.newsletter-page__subscribe h2 { margin: 0 0 20px; font-size: clamp(38px, 3.4vw, 54px); line-height: 1.08; letter-spacing: -.035em; }
.newsletter-page__subscribe p { max-width: 42ch; margin: 0; }
.newsletter-page__choice { align-self: center; }
.newsletter-page__join { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; margin-bottom: 20px; padding: 11px 22px; border: 1px solid var(--gs-ink); background: var(--gs-ink); color: var(--gs-paper); text-decoration: none; }
.newsletter-page__join:hover { background: #0d5a35; color: var(--gs-paper); }
.newsletter-page__choice > p { color: var(--gs-muted); font-size: 17px; }
.newsletter-page__choice .newsletter-page__fine { margin-top: 10px; font-size: 15px; }
.newsletter-page__stories { display: flex; align-items: center; justify-content: space-between; gap: 38px; padding: 34px 0; border-bottom: 1px solid var(--gs-rule); }
.newsletter-page__stories h2 { margin: 0 0 12px; font-size: clamp(30px, 2.6vw, 42px); line-height: 1.12; }
.newsletter-page__stories p { max-width: 60ch; margin: 0; }
.newsletter-page__stories > a { flex: 0 0 auto; }
.newsletter-page a:not(.newsletter-page__join) { color: var(--gs-ink); text-underline-offset: 4px; }
.newsletter-page__invitation { margin: 30px 0 0; color: var(--gs-muted); }
.newsletter-page__invitation a { display: inline-block; margin-left: 8px; }
@media (max-width: 760px) {
  .newsletter-page h1 { font-size: 42px; }
  .newsletter-page__subscribe { grid-template-columns: minmax(0, 1fr); gap: 28px; padding: 28px 0; }
  .newsletter-page__subscribe h2 { font-size: 38px; }
  .newsletter-page__stories { flex-direction: column; align-items: flex-start; gap: 20px; padding: 28px 0; }
  .newsletter-page__stories h2 { font-size: 32px; }
  .newsletter-page__invitation a { margin-left: 0; }
}
</style>
