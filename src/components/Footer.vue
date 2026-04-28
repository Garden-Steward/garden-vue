<script setup>
</script>

<template>
  <footer class="footer-container">
    <div class="text-center mt-4">
      <p>
        <img 
          src="https://storage.googleapis.com/steward_upload/uploads/garden_steward_logo_green_sq_350_75514db053/garden_steward_logo_green_sq_350_75514db053.jpg" 
          class="navbar-brand mx-auto h-40" 
          alt="Garden Steward Logo"
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

/* Explicit repeat so html.dark page styles never strip the footer band */
:global(html.dark) .footer-container {
  background-color: #8da382;
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
