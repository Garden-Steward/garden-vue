<script setup>
import OverviewIcon from './icons/Overview.svg?raw';
import EventsIcon from './icons/Events.svg?raw';
import VolunteersIcon from './icons/Volunteers.svg?raw';
import ProjectsIcon from './icons/Projects.svg?raw';
import TasksIcon from './icons/Tasks.svg?raw';
import SmsIcon from './icons/Sms.svg?raw';
import MessagesIcon from './icons/Messages.svg?raw';

defineProps({
  activeSection: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:activeSection']);

// Icon mapping
const iconMap = {
  general: OverviewIcon,
  events: EventsIcon,
  volunteers: VolunteersIcon,
  projects: ProjectsIcon,
  tasks: TasksIcon,
  sms: SmsIcon,
  messages: MessagesIcon,
};

// Navigation items
const navItems = [
  { id: 'general', label: 'General' },
  { id: 'events', label: 'Events' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'sms', label: 'SMS Campaigns' },
  { id: 'messages', label: 'Task Messages' },
];

const setActiveSection = (section) => {
  emit('update:activeSection', section);
};
</script>

<template>
  <aside class="w-full lg:w-64 flex-shrink-0">
    <nav class="bg-[rgba(26,26,26,0.6)] rounded-lg shadow-md p-2 sticky top-4">
      <ul class="sidebar-nav">
        <li v-for="item in navItems" :key="item.id" class="sidebar-nav-item">
          <button
            @click="setActiveSection(item.id)"
            :class="[
              'sidebar-nav-link',
              activeSection === item.id ? 'active' : ''
            ]"
          >
            <span class="sidebar-nav-icon" v-html="iconMap[item.id]"></span>
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar-nav {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.sidebar-nav-item {
  margin-bottom: 0.5rem;
  margin-left: 0 !important;
  padding-left: 0 !important;
  list-style-type: none !important;
}

.sidebar-nav-link {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border: none;
  background: #2d3e26;
  color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 1rem;
}

.sidebar-nav-link:hover {
  background-color: #344a34;
}

.sidebar-nav-link.active {
  background-color: #8aa37c;
  color: #fff;
  font-weight: 600;
}

.sidebar-nav-icon {
  font-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.sidebar-nav-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke: #f5f5f5;
  fill: #f5f5f5;
}

.sidebar-nav-link.active .sidebar-nav-icon :deep(svg) {
  stroke: #fff;
  fill: #fff;
}
</style>

