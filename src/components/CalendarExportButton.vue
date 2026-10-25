<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { buildCalendarFile, buildCalendarLinks } from '@/helpers/calendar-export';

const props = defineProps({ event: { type: Object, required: true } });
const menu = ref(null);
const providerLinks = ref(null);
const downloadError = ref('');
const downloads = new Map();

function closeMenu(restoreFocus = false) {
    if (!menu.value) return;
    menu.value.open = false;
    if (restoreFocus) menu.value.querySelector('summary').focus();
}

function prepareLinks() {
    if (!menu.value?.open) return;
    downloadError.value = '';
    try {
        providerLinks.value = buildCalendarLinks(props.event, { origin: window.location.origin });
    } catch {
        closeMenu();
        downloadError.value = "Couldn't prepare this event. Try again.";
    }
}

function onEscape(event) {
    if (event.key !== 'Escape' || !menu.value?.open) return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
}

function outside(event) {
    if (menu.value?.open && !menu.value.contains(event.target)) closeMenu();
}

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
        closeMenu(true);
    } catch {
        if (url) release(url);
        downloadError.value = "Couldn't download this calendar file. Try again.";
    } finally {
        link?.remove();
    }
}

onMounted(() => {
    document.addEventListener('click', outside);
    document.addEventListener('keydown', onEscape, true);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', outside);
    document.removeEventListener('keydown', onEscape, true);
    for (const url of downloads.keys()) release(url);
});
</script>

<template>
    <div class="calendar-export">
        <details ref="menu" class="calendar-export__menu" @toggle="prepareLinks">
            <summary class="calendar-export__button">+ Add to Calendar</summary>
            <div v-if="providerLinks" class="calendar-export__choices" role="group" aria-label="Calendar options">
                <a :href="providerLinks.google" target="_blank" rel="noopener noreferrer" @click="closeMenu(false)">Google Calendar</a>
                <a :href="providerLinks.outlook" target="_blank" rel="noopener noreferrer" @click="closeMenu(false)">Outlook</a>
                <button type="button" @click="download">Apple Calendar</button>
                <button type="button" @click="download">Download calendar file</button>
            </div>
        </details>
        <p v-if="downloadError" class="calendar-export__error" role="alert">{{ downloadError }}</p>
    </div>
</template>

<style scoped>
.calendar-export { min-width: 0; max-width: 100%; color: inherit; font: 16px/1.4 var(--gs-body-font, 'Gill Sans', sans-serif); }
.calendar-export__menu { width: fit-content; max-width: 100%; }
.calendar-export__button { display: block; list-style: none; min-height: 42px; max-width: 100%; padding: 10px 16px; border: 1px solid #024023; border-radius: 0; background: #f1f2d5; color: #024023; font: inherit; cursor: pointer; white-space: normal; text-align: left; }
.calendar-export__button::-webkit-details-marker { display: none; }
.calendar-export__button:hover { background: #e4e8cc; }
.calendar-export__choices { display: grid; gap: 0; min-width: 0; margin-top: 6px; padding: 4px 0; border: 1px solid var(--gs-rule); background: var(--gs-paper); }
.calendar-export__choices a, .calendar-export__choices button { display: block; width: 100%; padding: 10px 14px; border: 0; background: transparent; color: var(--gs-ink); font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.calendar-export__choices a:hover, .calendar-export__choices button:hover { background: var(--gs-sage, #e4e8cc); }
.calendar-export :focus-visible { outline: 2px solid #024023; outline-offset: 3px; }
.calendar-export__error { max-width: 36ch; margin: 8px 0 0; padding: 0; font-size: 14px; line-height: 1.4; color: #a12c2d; }
</style>
