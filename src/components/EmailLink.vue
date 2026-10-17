<script setup>
// A mailto link that keeps our address away from harvesting bots:
// - the address is stored in pieces and joined at runtime, so it never appears
//   whole in the HTML or the built JS bundle (a literal "a" + "@" + "b" would be
//   constant-folded back together by the minifier; .join() is not);
// - the real mailto: href is only set once a person hovers, taps or focuses the
//   link, so crawlers reading the rendered DOM see a placeholder.
// Without a slot, the link text is the address itself.
import { computed, ref } from 'vue';

const props = defineProps({
  user: { type: String, default: 'volunteer' },
  domain: { type: String, default: 'oufp.org' },
  subject: { type: String, default: '' },
});

const revealed = ref(false);
const address = computed(() => [props.user, props.domain].join('@'));
const mailto = computed(() => {
  const query = props.subject ? `?subject=${encodeURIComponent(props.subject)}` : '';
  return `mailto:${address.value}${query}`;
});

function reveal() {
  revealed.value = true;
}

// Fallback for a click that arrives without a hover or focus first.
function onClick(event) {
  if (revealed.value) return;
  event.preventDefault();
  reveal();
  window.location.href = mailto.value;
}
</script>

<template>
  <a :href="revealed ? mailto : '#contact'" @pointerenter="reveal" @focus="reveal" @click="onClick"><slot>{{ address }}</slot></a>
</template>
