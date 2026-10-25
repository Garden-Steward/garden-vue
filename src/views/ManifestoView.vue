<script setup>
import PageHeader from '@/components/PageHeader.vue';
const manifestoText = `We are life, seeking fulfillment. We arose on this Earth bustling in biodiversity, an ever-evolving symphony of new life. Animal, insect, plant, and fungal — life beyond imagining. Life supports life, and from it, ever new forms arise. Evolution creates biodiversity. Biodiversity is life succeeding. This is our purpose — as life, as animals, as humans, as community, as nature. Service is our means to fulfillment in this life. When the various shapes of life commingle, through diversity we create beauty.

This beauty is how all species, including us, came to be.

Life is tethered in chains and needs to be set free. Earth suffers from the gluttony of private interest, and we suffer with it. Our fate is bound to the Earth's. We can free all of it, all of us, from captivity — not all at once, but in small steps, consistently. In action, in service, we live a life of purpose.

There is energy rising, a momentum towards renewal. We must gather and organize around our land, and harness it. Our communities are ready to put their hands on something real. Steward the land. Bring back ecosystems. Create bounty of food and medicine. Rebuild wonder. We imagine, and we make it. Native plants and wildlife, come roaring back. It's more than possible. Our watersheds hold it all together. We share water, we share land, we share life. So we protect the water, we restore the land, we tend the living world.

One by one, we stand up and offer ourselves to this already bustling movement. We believe we can do this. That the whole of life can thrive. With enough of us, the pendulum swings back toward life. This is the mix of generations ready to carry it through.

We're tired of this shallow, broken, inherited system. The readiness to change is at quorum. We have more knowledge, and more power to act, than ever before. We are remembering our deep and ancient roots.

We will bring the ancient ways back into our modern lives, and let them enter, and heal, and teach once again. For this, we need to quiet our minds and learn to lead and listen from our hearts.

It's happening right now. We are in the rediscovery and renewal. People are waking up, ready to slip off the tethers — the story that we are disconnected from the whole. We are in the untethering of the nature within us and around us.

We are nature. We must act as nature.`
</script>

<template>
  <PageHeader eyebrow="Manifesto" title="Our manifesto" width="900px" />
  <!-- Light: cream panel + forest copy. Dark: same canvas #2d3e26 as body, light gray copy. -->
  <div class="manifesto-page py-6 md:py-10 dark:bg-[#2d3e26] rounded-none md:rounded-lg">
    <div class="manifesto-panel bg-custom-light dark:bg-[#2d3e26] p-5 rounded-lg md:w-2/3 lg:w-3/4 mx-auto text-gray-900 dark:text-[#d0d0d0]">
    <!-- Manifesto Text -->
    <div class="manifesto-body max-w-none space-y-6">
      <template v-for="(paragraph, index) in manifestoText.split('\n\n')" :key="index">
        <p class="manifesto-p text-lg leading-relaxed text-gray-800 dark:text-[#d0d0d0]">
          {{ paragraph }}
        </p>
      </template>
    </div>

    <!-- Call to Action -->
    <div class="manifesto-media mt-8 p-6 bg-[#344a34] rounded-lg text-center dark:bg-[#344a34]">
      <p class="manifesto-media-text text-xl mb-4">Does this resonate with you?</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/gardens" class="hover:underline text-slate-50 mt-3 btn btn-primary bg-custom-green hover:bg-custom-green border-white">
          Find a Garden
        </a>
        <a href="/contribute" class="hover:underline text-slate-50 mt-3 btn btn-secondary bg-custom-green hover:bg-custom-green border-white dark:!text-slate-50 dark:!border-white">
          Get Involved
        </a>
      </div>
    </div>
    </div>
  </div>
</template>
