<script setup>
const audioUrl = 'https://storage.googleapis.com/steward_upload/uploads/audio_manifesto_f185ad49_9617_44ae_b3ab_9bf308088677.m4a'

const manifestoText = `We are life seeking fulfillment.

We rose on a planet bustling in biodiversity, an ever-evolving harmonic creation of new life. The sheer quantity of unique animal, insect, plant, fungal life is mind-bending. Biodiversity is the outcome of life succeeding. Life supports life in countless ways, giving it the capacity to find openings for ever newer forms of life to exist.

This is our purpose.

As life, as animals, as humans, as citizens, as community members, as individuals, as nature, to seek fulfillment, to feel fulfilled, is to support life to thrive, to be in service, to be diverse, to be untethered, unbound from the fences, concrete, trash we're covered in.

We imprisoned ourselves in private interest. Humans suffer in equal measure with the earth. We have a stake in this, and there are things we can do regularly to remove all of it, all of us, from captivity.

There are so many actions to take. We can live a life of purpose. I want to discover people with that same itch, people ready to get involved, put their hands on something real, steward the land, to plant, enhance life, to bring back ecosystems, to rebuild around and live amongst the beautiful resurgence of flora and fauna in our watershed.

We share land. We share life.

All we have to do is restore the land little bit by little bit. And I offer my service to this already bustling movement. The idea that we can do this, that life can thrive once again, like it did when we were the latest addition to diversity, this generation can be the first to really flip that switch, and we're tired of our broken and shallow system. And we have more capacity than ever before. Awareness is spreading.

We will connect with the ancient, hear what it has to teach. It's always been teaching. We just need to start learning how to listen. We need to learn to listen with our hearts.

We cannot continue to forget our place in nature. If there's anything to take pride in, it is we are nature. We are the product of biodiversity, nature succeeding, life succeeding.

We can succeed. I believe in humans. And we have the tools to do it now.

Just believe and act.`
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
      <p class="text-[#d0d0d0] text-sm mt-3 dark:text-[#d0d0d0]">Recorded February 2026</p>
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
