<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'
import { ref, computed, defineOptions } from 'vue';
import { format } from 'date-fns'
import { vOnClickOutside } from '@vueuse/components'
import { backendHelper } from '@/helpers';

// const dropDown = ref(0);
// let root = ref(null);

const props = defineProps({
  id: Number,
  garden: Number,
  firstName: String,
  email: String,
  lastName: String,
  phoneNumber: String,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  provider: String,
  bio: String,
  color: String,
  paused: Boolean,
  interests: Array,
  u_g_interests: Object,
  editor: Boolean,
  managerIds: {
    type: Array,
    default: () => []
  },
  role: {
    type: Object,
    default: null
  }
})
defineOptions({ inheritAttrs: false })


let ugArr, basicUgArr
if (props.u_g_interests.data) {
  ugArr = props.u_g_interests.data.filter((ugi)=> ugi.attributes.interest && ugi.attributes.garden.data.id == props.garden)
  basicUgArr = ugArr.map((ugi)=> {
      return ugi.attributes.interest.data.id
  })
  ugArr = ugArr.map((ugi)=> {
      return {interest: ugi.attributes.interest.data.id, id: ugi.id}
  })
  console.log(ugArr)
}
const prettyDay = format(new Date(props.createdAt), 'yyyy-MM-dd');
const displayName = computed(() => (props.firstName || props.lastName) ? `${props.firstName} ${props.lastName}` : props.phoneNumber);
const isManager = computed(() => props.managerIds.includes(props.id));
const roleName = computed(() => {
  if (!props.role) return null;
  // Handle Strapi nested format: { data: { attributes: { name } } }
  if (props.role.data?.attributes?.name) return props.role.data.attributes.name;
  // Handle flat format: { name }
  if (props.role.name) return props.role.name;
  return null;
});
const isAuthenticated = computed(() => roleName.value === 'Authenticated');

const interestTags = computed(() => {
  return props.interests
    .filter(interest => basicUgArr && basicUgArr.find(ug => ug == interest.id))
    .map(interest => interest.tag)
    .join(', ');
});

const isExpanded = ref(false);
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const ignoreElRef = ref()
const onClickOutsideHandler = [
  (ev) => {
    if (ev.target.nodeName != 'LABEL' && ev.target.nodeName != 'INPUT') {
      // isExpanded.value = false;
    }
  },
  { ignore: [ignoreElRef] },
]

const requestRegistration = (id) => {
  backendHelper.requestRegistration(id).then((res)=> {
    console.log("vd resp: ", res);
  });
}
// const toggleDropdown = () => {
//   dropDown.value = !dropDown.value
// }

</script>

<template>

    <tr 
      class="tr-class"
      @click="toggleExpand"
    >
      <td class="td-class text-[#f5f5f5]">{{ displayName }} <span v-if="isManager" class="manager-badge">Manager</span><span v-if="isAuthenticated" class="auth-badge">Authenticated</span></td>
      <td class="td-class text-[#f5f5f5]">{{ prettyDay }}</td>
      <td class="td-class text-[#f5f5f5]">{{ interestTags }}</td>
</tr>

    <div 
      v-show="isExpanded"
      v-on-click-outside="onClickOutsideHandler"
      class="p-4 bg-[rgba(26,26,26,0.6)] border-t border-[#3d4d36]/50"
    >
      <p class="text-[#f5f5f5]"><span class="font-semibold">Email:</span> <span class="text-[#d0d0d0]">{{ email }}</span></p>
      <p class="text-[#f5f5f5]"><span class="font-semibold">Phone:</span> <span class="text-[#d0d0d0]">{{ phoneNumber }}</span></p>
      <p class="text-[#f5f5f5]"><span class="font-semibold">Interests:</span></p>
      <div v-for="interest in interests" :key="interest.id">
        <VolunteerInterest 
          v-bind="interest" 
          :ugArr="ugArr" 
          :garden="props.garden" 
          :user="props.id" 
          :editor="editor"
          ref="ignoreElRef"
        ></VolunteerInterest>
      </div>
      <div v-if="email =='test@test.com'">
        <button @click="requestRegistration({id})" class="bg-transparent hover:bg-orange-600 text-orange-600 font-semibold hover:text-white py-1 px-3 border border-orange-600 hover:border-transparent rounded">
          Request Complete Registration
        </button>
      </div>
    </div>
</template>

<style scoped>
  .td-class {
    @apply px-4 py-3 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 first:rounded-t-lg last:rounded-b-lg sm:first:rounded-t-none sm:last:rounded-b-none sm:first:rounded-tl-lg sm:first:rounded-bl-lg sm:last:rounded-tr-lg sm:last:rounded-br-lg cursor-pointer border-b hover:bg-[rgba(26,26,26,0.8)] transition-colors
  }
  .tr-class {
    @apply flex flex-col mb-4 sm:table-row
  }
  .manager-badge {
    @apply text-xs font-semibold px-2 py-0.5 rounded ml-2;
    background-color: #3d4d36;
    color: #fde047;
  }
  .auth-badge {
    @apply text-xs font-semibold px-2 py-0.5 rounded ml-2;
    background-color: #9a3412;
    color: #fff;
  }
</style>