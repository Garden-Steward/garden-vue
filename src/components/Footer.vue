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
          <span class="contribute-text text-white">Open Source For Good! Contribute</span>
          <i class="fab fa-github ml-2 text-white"></i>
        </router-link>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer-container {
  margin-top: 2rem;
  padding: 1rem 0;
}

.contribute-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8aa37c;
  text-decoration: none;
  transition: color 0.2s ease;
  margin-top: 1rem;
}

.contribute-link:hover {
  color: #6b8e5a;
  text-decoration: underline;
}

.contribute-text {
  font-weight: 500;
}

.contribute-link i {
  font-size: 1.2em;
}
</style>
