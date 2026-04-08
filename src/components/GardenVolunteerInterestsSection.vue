<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useInterestsStore, useGardensStore, useAlertStore } from '@/stores';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const props = defineProps({
  gardenId: {
    type: Number,
    required: true,
  },
  currentInterests: {
    type: Array,
    default: () => [],
  },
  editor: Boolean,
  /** When true (volunteers tab active), editors load the full interest list for the add dropdown */
  active: Boolean,
});

const route = useRoute();
const interestsStore = useInterestsStore();
const gardensStore = useGardensStore();
const alertStore = useAlertStore();

const { loading } = storeToRefs(interestsStore);

const selectedToAdd = ref('');

watch(
  () => [props.active, props.editor, props.gardenId],
  ([active, editor]) => {
    if (active && editor && props.gardenId) {
      interestsStore.findAll();
    }
  },
  { immediate: true }
);

const addableInterests = computed(() =>
  interestsStore.all.filter((i) => !i.gardenIds.includes(props.gardenId))
);

/** Garden `full` payload may use flat `{ id, tag }` or Strapi `{ id, attributes: { tag } }`. */
const displayInterests = computed(() =>
  (props.currentInterests || []).map((i) => ({
    id: i.id,
    tag: i.tag ?? i.attributes?.tag ?? '',
  }))
);

const onSelectInterest = async () => {
  const raw = selectedToAdd.value;
  if (!raw) return;
  const interestId = Number(raw);
  selectedToAdd.value = '';
  try {
    await interestsStore.addGardenToInterest(interestId, props.gardenId);
    await gardensStore.getSlug(route.params.slug);
    alertStore.success('Interest added to this garden.');
  } catch (e) {
    console.error(e);
    alertStore.error(typeof e === 'string' ? e : e?.message || 'Failed to add interest.');
  }
};
</script>

<template>
  <div class="mb-6 p-4 rounded-lg border border-[#3d4d36]/40 bg-[rgba(26,26,26,0.35)]">
    <h3 class="text-lg font-medium text-[#f5f5f5] mb-2">Garden interests</h3>
    <p class="text-sm text-[#c8c8c8] mb-4">
      These interests appear when volunteers choose what they care about and when you create volunteer days or SMS campaigns.
    </p>
    <div class="flex flex-col sm:flex-row sm:items-start gap-4">
      <div v-if="editor" class="flex-shrink-0 w-full sm:w-auto sm:min-w-[14rem]">
        <label class="block text-xs uppercase tracking-wide text-[#9a9a9a] mb-1" for="add-garden-interest">
          Add interest
        </label>
        <select
          id="add-garden-interest"
          v-model="selectedToAdd"
          :disabled="loading"
          class="w-full rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] disabled:opacity-60"
          @change="onSelectInterest"
        >
          <option value="">Choose an interest…</option>
          <option v-for="i in addableInterests" :key="i.id" :value="String(i.id)">
            {{ i.tag }}
          </option>
        </select>
        <div v-if="loading" class="mt-2">
          <LoadingSpinner size="sm" />
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs uppercase tracking-wide text-[#9a9a9a] mb-2">Current interests</p>
        <div v-if="displayInterests.length" class="flex flex-wrap gap-2">
          <span
            v-for="interest in displayInterests"
            :key="interest.id"
            class="inline-flex items-center rounded-full bg-[#3d4d36]/60 text-[#f5f5f5] px-3 py-1 text-sm"
          >
            {{ interest.tag }}
          </span>
        </div>
        <p v-else-if="!displayInterests.length" class="text-[#a0a0a0] text-sm">
          No interests yet<span v-if="editor"> — pick one from the menu to link it to this garden.</span><span v-else>.</span>
        </p>
      </div>
    </div>
  </div>
</template>
