<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";

import { useAuthStore, useGardensStore } from '@/stores';

export default {
  name: "GardenView",
  setup() {
    // initialize the store
    const authStore = useAuthStore();
    const { user } = storeToRefs(authStore);
    const gardensStore = useGardensStore();  
    const route = useRoute()
    gardensStore.getSlug(route.params.slug)
    const { garden } = storeToRefs(gardensStore);

    return {user, garden}
  },

  data() {
    return {
      // ...
    }
  },

  methods: {
    checkLoginState() {
      this.userStore.checkLoginState()
    }
  }
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <div class="table-auto" v-if="garden.id">
          <h3>Garden:{{ $route.params.slug }}</h3>
          <p>{{ garden.attributes.title }}</p>
        </div>
        <!-- <ul >
            <li v-for="garden in gardens" :key="garden.id">{{garden.make}} {{garden.model}}</li>
        </ul> -->
        <div v-if="garden.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="garden.error" class="text-danger">Error loading gardens: {{garden.error}}</div>

    </div>
</template>
