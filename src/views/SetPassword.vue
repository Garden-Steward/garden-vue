<script setup>
import SetPassesForm from '../components/auth/SetPassesForm.vue';
import StartPasswordForm from '../components/auth/StartPasswordForm.vue'


let urlParams = new URLSearchParams(window.location.search);
let code = false
if (urlParams.has('code')) {
    code = urlParams.get('code');
}

</script>

<template>
    <div class="max-w-md w-full mx-auto mt-8 stew">
        <h1 class="text-2xl pb-5 pt-2">Set Password</h1>
        <div v-if="code">
            <SetPassesForm :code="code" />
        </div>

        <div v-else>
            <StartPasswordForm />
        </div>
        <div><a href="login" class="hover:underline text-green-700 hover:text-green-900">Back to Login</a></div>
    </div>
</template>
