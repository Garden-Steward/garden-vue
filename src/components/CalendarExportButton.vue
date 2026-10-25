<script setup>
import { onBeforeUnmount, ref } from 'vue';
import { buildCalendarFile } from '@/helpers/calendar-export';

const props = defineProps({ event: { type: Object, required: true } });
const downloadError = ref('');
const downloads = new Map();

function release(url) {
    window.clearTimeout(downloads.get(url));
    URL.revokeObjectURL(url);
    downloads.delete(url);
}

function download() {
    downloadError.value = '';
    let url;
    let link;
    try {
        const file = buildCalendarFile(props.event, { origin: window.location.origin, generatedAt: new Date() });
        url = URL.createObjectURL(new Blob([file.calendarText], { type: 'text/calendar;charset=utf-8' }));
        downloads.set(url, null);
        link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        link.hidden = true;
        document.body.append(link);
        link.click();
        downloads.set(url, window.setTimeout(() => release(url), 1000));
    } catch {
        if (url) release(url);
        downloadError.value = "Couldn't download this calendar file. Try again.";
    } finally {
        link?.remove();
    }
}

onBeforeUnmount(() => {
    for (const url of downloads.keys()) release(url);
});
</script>

<template>
    <div class="calendar-export">
        <button type="button" class="calendar-export__button" @click="download">Calendar file · start time only</button>
        <p class="calendar-export__note">Start time only. See event details for end information.</p>
        <p v-if="downloadError" class="calendar-export__error" role="alert">{{ downloadError }}</p>
    </div>
</template>

<style scoped>
.calendar-export { min-width: 0; max-width: 100%; color: inherit; font: 16px/1.4 var(--gs-body-font, 'Gill Sans', sans-serif); }
.calendar-export__button { min-height: 42px; max-width: 100%; padding: 10px 16px; border: 1px solid #024023; border-radius: 0; background: #f1f2d5; color: #024023; font: inherit; cursor: pointer; white-space: normal; text-align: left; }
.calendar-export__button:hover { background: #e4e8cc; }
.calendar-export__button:focus-visible { outline: 2px solid #024023; outline-offset: 3px; }
.calendar-export__note, .calendar-export__error { max-width: 36ch; margin: 8px 0 0; padding: 0; font-size: 14px; line-height: 1.4; }
.calendar-export__note { color: inherit; }
.calendar-export__error { color: #a12c2d; }
</style>
