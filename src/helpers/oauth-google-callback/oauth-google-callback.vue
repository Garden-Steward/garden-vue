
<template>
     <div>
       <div>Completing Login...</div>    
     </div>  
</template>

<script>
import { useAuthStore } from '@/stores';

export default {
  name: 'oauth-google-callback',
  mounted() {

    const params = new URLSearchParams(window.location.search);
    console.log("params: ", params)
    if (!params.has('code')) {
      throw new Error('No oauth code');
    }

    const code = params.get('code');
    const authStore = useAuthStore();

    return authStore.loginGoogle(code);
  }
};
</script>
