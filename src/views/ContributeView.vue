<script setup>
</script>

<template>
    <div class="bg-custom-light p-5 rounded-lg md:w-2/3 lg:w-3/4 mx-auto">
        <div class="text-lg mt-6 max-w-xl w-full mx-auto mt-8 mb-4">
            <h1 class="text-2xl text-center mb-6">Contribute to Garden Steward</h1>
            
            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">About the Project</h2>
                <p class="mb-4">
                    Garden Steward is an open-source, community-driven project that helps organize and manage community gardens through SMS-first communication. We're always looking for developers, designers, and community organizers to help improve the platform!
                </p>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">Architecture Overview</h2>
                <p class="mb-3">
                    Garden Steward is built with a modern, decoupled architecture:
                </p>
                <ul class="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Frontend (garden-vue)</strong>: Vue 3 application with Pinia for state management, Vue Router for navigation, and Tailwind CSS for styling</li>
                    <li><strong>Backend (steward-bank)</strong>: Strapi-based API with PostgreSQL for data persistence, Google Cloud Storage for media, and Twilio for SMS integration</li>
                    <li><strong>SMS Integration</strong>: Twilio integration for SMS-first communication</li>
                </ul>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">Getting Started</h2>
                <p class="mb-3">
                    Ready to start organizing community engagement? Here's how you can get involved:
                </p>
                <ol class="list-decimal pl-6 mb-4 space-y-2">
                    <li><strong>Connect Your Twilio Account</strong>: Set up your own phone line by connecting your Twilio account to start organizing community engagement right away!</li>
                    <li><strong>Explore the Codebase</strong>: Check out our repositories on GitHub to understand the codebase structure</li>
                    <li><strong>Pick an Issue</strong>: Look for open issues labeled "good first issue" or areas you'd like to contribute to</li>
                    <li><strong>Submit Your Changes</strong>: Fork the repository, make your changes, and submit a pull request</li>
                </ol>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">Repositories</h2>
                <div class="space-y-3">
                    <div class="p-4 bg-white rounded-lg border border-gray-200">
                        <h3 class="font-semibold mb-2">Frontend Repository</h3>
                        <p class="text-sm mb-2">The Vue 3 frontend application for Garden Steward</p>
                        <a href="https://github.com/Garden-Steward/garden-vue" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="text-green-700 hover:text-green-900 hover:underline font-medium">
                            View on GitHub →
                        </a>
                    </div>
                    <div class="p-4 bg-white rounded-lg border border-gray-200">
                        <h3 class="font-semibold mb-2">Backend Repository</h3>
                        <p class="text-sm mb-2">The steward-bank backend API built with Strapi, featuring PostgreSQL, Twilio SMS integration, and Google Cloud Storage</p>
                        <a href="https://github.com/Garden-Steward/steward-bank" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="text-green-700 hover:text-green-900 hover:underline font-medium">
                            View on GitHub →
                        </a>
                    </div>
                </div>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">Technology Stack</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="p-3 bg-white rounded border border-gray-200">
                        <h3 class="font-semibold text-sm mb-1">Frontend</h3>
                        <p class="text-sm">Vue 3, Pinia, Vue Router, Tailwind CSS, Vite</p>
                    </div>
                    <div class="p-3 bg-white rounded border border-gray-200">
                        <h3 class="font-semibold text-sm mb-1">Backend</h3>
                        <p class="text-sm">Strapi, PostgreSQL, Google Cloud Storage</p>
                    </div>
                    <div class="p-3 bg-white rounded border border-gray-200">
                        <h3 class="font-semibold text-sm mb-1">SMS</h3>
                        <p class="text-sm">Twilio</p>
                    </div>
                    <div class="p-3 bg-white rounded border border-gray-200">
                        <h3 class="font-semibold text-sm mb-1">Deployment</h3>
                        <p class="text-sm">Firebase Hosting</p>
                    </div>
                </div>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">How to Contribute</h2>
                <p class="mb-3">
                    We welcome contributions of all kinds! Here are some ways you can help:
                </p>
                <ul class="list-disc pl-6 mb-4 space-y-2">
                    <li>Report bugs or suggest new features</li>
                    <li>Submit code improvements or new features</li>
                    <li>Improve documentation</li>
                    <li>Help with design and user experience</li>
                    <li>Share your experience using Garden Steward</li>
                </ul>
            </div>

            <div class="mb-6">
                <h2 class="text-xl font-bold mb-3">Questions or Need Help?</h2>
                <p class="mb-3">
                    Have questions about contributing? We'd love to hear from you!
                </p>
                <p>
                    Email: <a href="mailto:volunteer@oufp.org" class="text-green-700 hover:text-green-900 hover:underline">volunteer@oufp.org</a>
                </p>
            </div>

            <div class="mt-6 text-center flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://github.com/Garden-Steward/garden-vue" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="inline-block mt-3 btn btn-primary bg-custom-green hover:bg-custom-green border-white">
                    View Frontend on GitHub
                </a>
                <a href="https://github.com/Garden-Steward/steward-bank" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="inline-block mt-3 btn btn-secondary bg-custom-green hover:bg-custom-green border-white">
                    View Backend on GitHub
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.list-disc {
    list-style-type: disc;
}
.list-decimal {
    list-style-type: decimal;
}
</style>

