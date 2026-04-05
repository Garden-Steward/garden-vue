<script setup>
const audioUrl = 'https://storage.googleapis.com/steward_upload/uploads/manifesto_audio_391eee28a7/manifesto_audio_391eee28a7.m4a'

const manifestoText = `We are life-seeking fulfillment.

We arose on a planet bustling in biodiversity, an ever-evolving harmonic creation of new life.

The sheer quantity of unique animal, insect, plant, and fungal life is mind-bending.

Life supports life, upon which, ever new forms of life exist.

Evolution creates Biodiversity.

Biodiversity is life succeeding.

This is our purpose as life, as animals, as humans, as community, as nature.

To seek fulfillment, to feel fulfilled, is to support life to thrive.

Service is our means to fulfillment in this life.

When we see and experience diversity we witness the success of life.

When the various shapes of life commingle, we create beauty, and our momentum of creation creates.

This is how all species, including us, came to be.

Life is tethered in chains and needs to be set free.

It's okay for us to acknowledge our current actions are the problem. It's the only way we can fix it.

Earth suffers from the gluttony of Private Interest.

Humans suffer in equal measure with the Earth.

We have a stake in this.

There are things we can do every day to remove all of it, all of us, from captivity.

The actions to take can easily overwhelm. It's just small steps, consistently.

In action, in service, we live a life of purpose.

We must gather and organize around our land.

Harness this energy, this momentum towards renewal.

Our communities are ready to get involved, put their hands on something real.

Steward the land. Bring back ecosystems. Create bounty of food and medicine.

Rebuild. Wonder.

We imagine, and we make it.

How about a bountiful resurgence of the native flora and fauna?

It's more than possible.

Let's look to our watersheds.

We share water, we share land, we share life.

We must protect the water, restore the land, and prioritize biodiversity.

I offer my service to this already bustling movement.

I believe we can do this.

That the whole of life can thrive like when humans were the newest bio on the block.

With enough people it tips and turns.

This is the mix of generations that will finally flip that switch.

We're tired of this shallow, broken, inherited system.

The readiness to change is at quorum.

We have more knowledge and capabilities than ever before.

There is growing awareness of our deep roots of being.

We will reconnect the civilized with the ancient and allow it to enter and heal and teach once again.

For this, we need to deemphasize our minds and learn to lead and listen from our hearts.

There is no waiting.

We are here at the rediscovery and renewal. People are catching up.

We are in the untethering of the nature-within-us and-around-us.

We are nature.

We must act as nature.`
</script>

<template>
  <div class="bg-custom-light p-5 rounded-lg md:w-2/3 lg:w-3/4 mx-auto">
    <h1 class="text-3xl text-center mb-6">Our Manifesto</h1>
    
    <!-- Audio Player Section -->
    <div class="bg-[#344a34] p-6 rounded-lg mb-8 text-center dark:bg-[#2d3e26]">
      <p class="text-[#f5f5f5] text-lg mb-4 dark:text-[#f5f5f5]">Listen to the audio version</p>
      <audio controls class="w-full max-w-md mx-auto">
        <source :src="audioUrl" type="audio/mp4">
        Your browser does not support the audio element.
      </audio>
      <p class="text-[#d0d0d0] text-sm mt-3 dark:text-[#d0d0d0]">Recorded April 2026</p>
    </div>
    
    <!-- Manifesto Text -->
    <div class="prose prose-lg max-w-none dark:prose-invert">
      <template v-for="(paragraph, index) in manifestoText.split('\n\n')" :key="index">
        <p class="text-lg leading-relaxed">{{ paragraph }}</p>
      </template>
    </div>
    
    <!-- Call to Action -->
    <div class="mt-8 p-6 bg-[#344a34] rounded-lg text-center dark:bg-[#2d3e26]">
      <p class="text-[#f5f5f5] text-xl mb-4 dark:text-[#f5f5f5]">Does this resonate with you?</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/join" class="hover:underline text-slate-50 mt-3 btn btn-primary bg-custom-green hover:bg-custom-green border-white">
          Join Our Movement
        </a>
        <a href="/contribute" class="hover:underline text-slate-50 mt-3 btn btn-secondary bg-custom-green hover:bg-custom-green border-white">
          Get Involved
        </a>
      </div>
    </div>
  </div>
</template>
