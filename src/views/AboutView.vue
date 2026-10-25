<script setup>
import ManageLayout from '@/components/ManageLayout.vue';
</script>

<template>
  <ManageLayout>
    <main class="about-page">
      <header class="about-page__intro">
        <p class="about-page__eyebrow">East Bay Permaculture Guild</p>
        <h1>Good for the earth.<br>Good for each other.</h1>
        <p class="about-page__lead">Permaculture starts with a simple idea: care for the places that care for us.</p>
        <p class="about-page__description">Grow food. Help soil hold water. Make room for wildlife. Share what you know. Here in the East Bay, we learn these things together, one garden and one gathering at a time.</p>
      </header>

      <figure class="about-page__photo">
        <img src="/photos/garden-volunteers.jpg" alt="Garden volunteers pausing together during a workday" width="1600" height="930">
        <figcaption>Good things happen when neighbors show up.</figcaption>
      </figure>

      <section class="about-page__community" aria-labelledby="community-heading">
        <div class="about-page__story">
          <h2 id="community-heading">Neighbors<br>learning<br>from neighbors.</h2>
          <p>A volunteer-run community with more than 15 years of roots, and a program of Collective Resilience.</p>
          <a class="about-page__guild" href="https://collectiveresiliencenow.org/east-bay-permaculture-guild/" target="_blank" rel="noopener noreferrer">Meet the Guild ↗</a>
        </div>
        <div class="about-page__participate">
          <ol class="about-page__steps">
            <li>
              <span class="about-page__step-number" aria-hidden="true">01</span>
              <div>
                <h3>Come for a workday.</h3>
                <p>Try something practical with people who can show you how.</p>
              </div>
            </li>
            <li>
              <span class="about-page__step-number" aria-hidden="true">02</span>
              <div>
                <h3>Stay for the people.</h3>
                <p>Share a meal, a question or a little of what you know.</p>
              </div>
            </li>
          </ol>
          <router-link to="/schedule" class="about-page__gathering">Find your next gathering ↗</router-link>
        </div>
      </section>
    </main>
  </ManageLayout>
</template>

<style scoped>
.about-page { min-height: 70vh; color: var(--gs-ink); font: 18px/1.6 var(--gs-body-font); }
.about-page__intro { max-width: 900px; margin-bottom: 30px; }
.about-page__eyebrow { display: flex; align-items: center; gap: 10px; margin: 0 0 24px; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; }
.about-page__eyebrow::before { content: ''; flex: 0 0 6px; width: 6px; height: 6px; border-radius: 50%; background: #c1272d; }
.about-page h1, .about-page h2 { font-family: var(--gs-heading-font); font-weight: 400; }
.about-page h1 { margin: 0 0 24px; font-size: clamp(44px, 4.8vw, 76px); line-height: 1.04; letter-spacing: -.045em; }
.about-page__lead { max-width: 36ch; margin: 0 0 28px; font: 400 clamp(25px, 2.3vw, 34px)/1.3 var(--gs-heading-font); }
.about-page__description { max-width: 78ch; margin: 0; font-size: 18px; line-height: 1.6; }
.about-page__photo { margin: 0; }
.about-page__photo img { display: block; width: 100%; height: auto; aspect-ratio: 2.6; object-fit: cover; object-position: 50% 0; border-radius: 100px 7px 100px 7px; }
.about-page__photo figcaption { margin-top: 10px; color: var(--gs-muted); font-size: 14px; line-height: 1.5; }
.about-page__community { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: clamp(30px, 6vw, 90px); border-top: 1px solid var(--gs-rule); margin-top: 28px; padding-top: 42px; }
.about-page h2 { margin: 0 0 18px; font-size: clamp(36px, 3.1vw, 48px); line-height: 1.05; letter-spacing: -.035em; }
.about-page__story > p { max-width: 42ch; margin: 0 0 18px; }
.about-page__guild { display: inline-block; color: var(--gs-ink); text-decoration: none; border-bottom: 1px solid var(--gs-ink); padding-bottom: 2px; }
.about-page__guild:hover { text-decoration: underline; text-underline-offset: 4px; }
.about-page__steps { list-style: none; padding: 0; margin: 0 0 22px; }
.about-page__steps li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 14px; padding: 0 0 22px; border-bottom: 1px solid var(--gs-rule); }
.about-page__steps li + li { padding-top: 22px; }
.about-page__step-number { color: #8d6b20; font: 400 22px/1.3 var(--gs-heading-font); }
.about-page__steps li:nth-child(2) .about-page__step-number { color: #c1272d; }
.about-page__steps h3 { font: 400 21px/1.4 var(--gs-body-font); margin: 0 0 5px; }
.about-page__steps p { margin: 0; color: var(--gs-muted); font-size: 17px; }
.about-page__gathering { display: flex; align-items: center; justify-content: center; min-height: 50px; padding: 12px 20px; border-radius: 30px; background: var(--gs-ink); color: var(--gs-paper); text-decoration: none; text-align: center; }
.about-page__gathering:hover { background: #0d5a35; color: var(--gs-paper); }
@media (max-width: 760px) {
  .about-page__eyebrow { font-size: 12px; letter-spacing: .12em; margin-bottom: 20px; }
  .about-page h1 { font-size: 42px; }
  .about-page__lead { font-size: 27px; }
  .about-page__photo img { aspect-ratio: 1.45; border-radius: 65px 5px 65px 5px; }
  .about-page__community { grid-template-columns: minmax(0, 1fr); gap: 32px; padding-top: 30px; }
  .about-page h2 { font-size: 36px; }
}
</style>
