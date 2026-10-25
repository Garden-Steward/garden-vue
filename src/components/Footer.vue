<script setup>
</script>

<template>
  <footer class="footer-container">
    <div class="text-center mt-4">
      <p>
        <img 
          src="/brand/garden-steward-wordmark.svg"
          class="navbar-brand footer-wordmark mx-auto"
          alt="Garden Steward"
        >
        <br />
        <router-link
          to="/contribute"
          class="contribute-link"
        >
          <span class="contribute-text">Open Source For Good! Contribute</span>
          <i class="fab fa-github ml-2" aria-hidden="true"></i>
        </router-link>
      </p>
    </div>
  </footer>
</template>

<style scoped>
/* Muted sage — matches footer/center panel in branding (same in light + dark mode) */
.footer-container {
  --footer-sage: #8da382;
  margin-top: 2rem;
  padding: 1.75rem 1rem 2rem;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--footer-sage);
}

.contribute-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
  margin-top: 1rem;
}

.footer-wordmark {
  display: block;
  width: min(82vw, 340px);
  height: auto;
}

.contribute-link:hover {
  color: #f7f1e3;
  text-decoration: underline;
}

.contribute-text {
  font-weight: 600;
}

.contribute-link i {
  font-size: 1.2em;
  color: inherit;
}
</style>

<!--
  `:global()` with a trailing descendant selector does not survive scoped-style
  compilation: ":global(.dark) .foo" becomes the bare rule ".dark { ... }",
  which lands on <html class="dark"> and leaks inheritable declarations such as
  color and -webkit-text-fill-color into every page. Dark-mode overrides live
  here instead, in a plain (non-scoped) <style> block with a literal
  "html.dark ..." selector — the same pattern ProjectsList.vue uses.
-->
<style>
/* Explicit repeat so html.dark page styles never strip the footer band */
html.dark .footer-container {
  background-color: #8da382;
}
</style>

