<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useRecurringTemplateStore, useEventStore } from '@/stores';
import RecurringTemplateModal from '@/components/modals/RecurringTemplateModal.vue';
import GardenSidebar from '@/components/GardenSidebar.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const showCreateModal = ref(false);

const route = useRoute();
const router = useRouter();
const gardensStore = useGardensStore();
const recurringTemplateStore = useRecurringTemplateStore();
const eventStore = useEventStore();
const authStore = useAuthStore();

const { user } = storeToRefs(authStore);
const { garden } = storeToRefs(gardensStore);
const { templates: recurringTemplates } = storeToRefs(recurringTemplateStore);

gardensStore.getSlug(route.params.slug);

watch(
  () => garden.value?.id,
  (gardenId) => {
    if (gardenId) {
      recurringTemplateStore.getByGarden(gardenId);
    }
  },
  { immediate: true }
);

const isEditor = computed(() => {
  if (!user.value?.id) return false;
  if (garden.value?.loading || !garden.value?.attributes) return false;
  const raw = garden.value?.attributes?.managers?.data ?? garden.value?.attributes?.managers;
  const list = Array.isArray(raw) ? raw : [];
  const uid = user.value.id;
  return list.some((m) => {
    const mid = typeof m === 'object' && m != null
      ? (m.id ?? m.attributes?.id)
      : m;
    return mid != null && mid == uid;
  });
});

const NTH_MAP = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };
const WEEKDAY_MAP = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
const NAMING_MAP = { title_month: 'month_year', title_nth_weekday: 'ordinal', title_full_date: 'full_date' };

function normalizeTemplate(t) {
  if (!t) return null;
  const attrs = t.attributes || t;
  const id = t.id ?? attrs.id;
  const nth = attrs.nth_occurrence;
  const dow = attrs.weekday;
  const rawNaming = attrs.naming_convention;
  const startTime = attrs.start_time;
  return {
    id,
    ...attrs,
    template_name: attrs.title_template ?? attrs.template_name,
    event_title_template: attrs.title_template ?? attrs.event_title_template,
    day_of_week: typeof dow === 'number' ? dow : (dow != null ? WEEKDAY_MAP[dow] : undefined),
    nth_occurrence: typeof nth === 'number' ? nth : (nth != null ? NTH_MAP[nth] : undefined),
    default_start_time: startTime ? String(startTime).slice(0, 5) : (attrs.default_start_time || '09:00'),
    default_end_text: attrs.end_text ?? attrs.default_end_text ?? 'around noon',
    default_blurb: attrs.blurb ?? attrs.default_blurb ?? '',
    naming_convention: NAMING_MAP[rawNaming] ?? rawNaming ?? 'month_year',
  };
}

const recurringTemplatesList = computed(() => {
  const raw = recurringTemplates.value?.items;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(normalizeTemplate).filter(Boolean);
});

const slug = computed(() => route.params.slug);

function onSidebarSection(section) {
  router.push({ path: `/manage/gardens/${slug.value}`, hash: `#${section}` });
}

function onRecurringTemplateSaved() {
  eventStore.getByGarden(route.params.slug, 1, 15);
  recurringTemplateStore.getByGarden(garden.value?.id);
}

function onRecurringTemplateDeleted() {
  recurringTemplateStore.getByGarden(garden.value?.id);
}
</script>

<template>
  <div class="bg-[#344a34] mx-auto min-h-screen">
    <!-- Garden title header (same as GardenDetail; sidebar hamburger teleports here) -->
    <div class="bg-gradient-to-r from-darker-green to-custom-green text-white py-6 px-0 sm:px-6 lg:px-8 shadow-md relative" id="garden-header">
      <div class="max-w-7xl mx-auto px-4 sm:px-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 v-if="garden?.attributes?.title" class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight pr-12 lg:pr-0">{{ garden.attributes.title }}</h1>
            <div v-else class="h-12 bg-white/20 rounded animate-pulse"></div>
            <p v-if="garden?.attributes?.blurb" class="text-white/90 text-lg mt-2">{{ garden.attributes.blurb?.length > 150 ? garden.attributes.blurb.substring(0, 150) + '...' : garden.attributes.blurb }}</p>
            <div v-else-if="garden?.loading || (!garden?.attributes && !garden?.error)" class="h-6 bg-white/20 rounded mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="garden?.loading || (!garden?.attributes && !garden?.error)" class="flex justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" :centered="true" />
    </div>

    <div v-else-if="garden?.attributes" class="flex flex-col lg:flex-row gap-6 px-2 sm:px-4 lg:px-6 p-1 sm:p-5">
      <GardenSidebar
        active-section="events"
        @update:active-section="onSidebarSection"
      />

      <main class="flex-1 min-w-0">
        <div class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 class="text-2xl font-light font-serif text-[#f5f5f5] mb-2">Recurring Event Templates</h2>
              <p class="text-[#d0d0d0] text-sm">
                Templates define patterns (e.g. “2nd Saturday of each month”) and generate events automatically.
              </p>
            </div>
            <button
              v-if="isEditor"
              type="button"
              class="flex items-center gap-2 shrink-0 rounded-full pl-2 pr-3 py-2 bg-custom-green hover:bg-darker-green text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-custom-green focus:ring-offset-2 focus:ring-offset-[#2d3e26]"
              aria-label="Add recurring template"
              @click="showCreateModal = true"
            >
              <span class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current text-base leading-none font-light">+</span>
              <span>Add</span>
            </button>
          </div>

          <div v-if="recurringTemplates?.loading" class="text-[#999] text-sm py-8">Loading templates…</div>
          <div v-else-if="recurringTemplates?.error" class="text-red-400 text-sm py-8">Error loading templates.</div>
          <div v-else-if="recurringTemplatesList.length === 0 && !isEditor" class="text-[#999] text-center py-12">
            No recurring templates.
          </div>
          <div v-else class="grid grid-cols-1 gap-4">
            <RecurringTemplateModal
              v-for="t in recurringTemplatesList"
              :key="t.id"
              v-bind="t"
              :garden="garden.id"
              :editor="isEditor"
              @saved="onRecurringTemplateSaved"
              @deleted="onRecurringTemplateDeleted"
            />
          </div>

          <RecurringTemplateModal
            v-if="isEditor"
            hide-trigger
            :garden="garden.id"
            :editor="isEditor"
            :show="showCreateModal"
            @update:show="showCreateModal = $event"
            @saved="onRecurringTemplateSaved"
          />
        </div>
      </main>
    </div>

    <div v-else-if="garden?.error" class="px-4 py-6">
      <div class="bg-[#2d3e26] rounded-lg p-6 text-red-400">Error loading garden.</div>
    </div>
  </div>
</template>
