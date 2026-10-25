<script setup>
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';

const mode = ref('hidden');
const cursorHost = shallowRef('body');
const position = ref({ x: 0, y: 0 });
let finePointer;
let reducedMotion;
let settleTimer;
let hostObserver;

function hide() {
    window.clearTimeout(settleTimer);
    mode.value = 'hidden';
    document.documentElement.classList.remove('gs-ladybug-cursor');
}

function updateEligibility() {
    const eligible = finePointer.matches && !reducedMotion.matches;
    if (!eligible) {
        hide();
        return;
    }
    if (mode.value !== 'hidden') {
        document.documentElement.classList.add('gs-ladybug-cursor');
    }
}

function isNativeCursorTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }
    if (target.closest('input, textarea, select, option, [role="textbox"]')) {
        return true;
    }
    const editable = target.closest('[contenteditable]');
    return editable !== null && editable.getAttribute('contenteditable') !== 'false';
}

function syncHost(target) {
    if (!(target instanceof Element)) {
        hide();
        cursorHost.value = 'body';
        return;
    }
    if (isNativeCursorTarget(target)) hide();
    const host = target.closest('dialog:modal') || 'body';
    if (cursorHost.value !== host) cursorHost.value = host;
}

function repairHost(records = []) {
    const host = cursorHost.value;
    const changedDialog = records.some(record => record.type === 'attributes');
    if (!changedDialog && (host === 'body' || (host.isConnected && host.matches('dialog:modal')))) return;
    syncHost(document.elementFromPoint(position.value.x, position.value.y));
}

function modalClosed() {
    syncHost(document.elementFromPoint(position.value.x, position.value.y));
}

function move(event) {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') {
        hide();
        return;
    }

    if (isNativeCursorTarget(event.target)) {
        hide();
        return;
    }

    position.value = { x: event.clientX, y: event.clientY };
    syncHost(event.target);
    mode.value = 'moving';
    document.documentElement.classList.add('gs-ladybug-cursor');
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
        mode.value = 'idle';
    }, 500);
}

function press(event) {
    if (isNativeCursorTarget(event.target)) {
        hide();
    }
}

function leave(event) {
    if (!event.relatedTarget) {
        hide();
    }
}

function visibilityChange() {
    if (document.hidden) {
        hide();
    }
}

onMounted(() => {
    finePointer = window.matchMedia('(pointer: fine) and (hover: hover)');
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    finePointer.addEventListener('change', updateEligibility);
    reducedMotion.addEventListener('change', updateEligibility);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerdown', press);
    document.addEventListener('pointerout', leave);
    document.addEventListener('pointercancel', hide);
    document.addEventListener('visibilitychange', visibilityChange);
    window.addEventListener('blur', hide);
    updateEligibility();
    document.addEventListener('close', modalClosed, true);
    document.addEventListener('toggle', modalClosed, true);
    hostObserver = new MutationObserver(repairHost);
    hostObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
});

onUnmounted(() => {
    hostObserver.disconnect();
    document.removeEventListener('close', modalClosed, true);
    document.removeEventListener('toggle', modalClosed, true);
    hide();
    finePointer.removeEventListener('change', updateEligibility);
    reducedMotion.removeEventListener('change', updateEligibility);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerdown', press);
    document.removeEventListener('pointerout', leave);
    document.removeEventListener('pointercancel', hide);
    document.removeEventListener('visibilitychange', visibilityChange);
    window.removeEventListener('blur', hide);
    document.documentElement.classList.remove('gs-ladybug-cursor');
});
</script>

<template>
    <Teleport :to="cursorHost">
        <div
            v-show="mode !== 'hidden'"
            class="ladybug-cursor"
            :style="{ left: `${position.x}px`, top: `${position.y}px` }"
            aria-hidden="true"
        >
            <img v-if="mode === 'idle'" class="ladybug-cursor__closed" src="/brand/ladybug-rest-v2.svg" alt="">
            <img v-else class="ladybug-cursor__open" src="/brand/ladybug-flight-v2.svg" alt="">
        </div>
    </Teleport>
</template>

<style>
html.gs-ladybug-cursor,
html.gs-ladybug-cursor * {
    cursor: none !important;
}

html.gs-ladybug-cursor input,
html.gs-ladybug-cursor select,
html.gs-ladybug-cursor option {
    cursor: auto !important;
}

html.gs-ladybug-cursor textarea,
html.gs-ladybug-cursor [contenteditable]:not([contenteditable="false"]),
html.gs-ladybug-cursor [contenteditable]:not([contenteditable="false"]) *,
html.gs-ladybug-cursor [role="textbox"],
html.gs-ladybug-cursor [role="textbox"] * {
    cursor: text !important;
}

.ladybug-cursor {
    position: fixed;
    z-index: 2147483647;
    width: 44px;
    height: 50px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    user-select: none;
}

.ladybug-cursor__closed {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.ladybug-cursor__open {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>
