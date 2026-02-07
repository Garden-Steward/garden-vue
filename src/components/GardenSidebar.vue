<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import OverviewIcon from './icons/Overview.svg?raw';
import EventsIcon from './icons/Events.svg?raw';
import VolunteersIcon from './icons/Volunteers.svg?raw';
import ProjectsIcon from './icons/Projects.svg?raw';
import TasksIcon from './icons/Tasks.svg?raw';
import SmsIcon from './icons/Sms.svg?raw';
import MessagesIcon from './icons/Messages.svg?raw';
import PlantsIcon from './icons/Plants.svg?raw';

defineProps({
  activeSection: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:activeSection']);

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Icon mapping
const iconMap = {
  general: OverviewIcon,
  events: EventsIcon,
  volunteers: VolunteersIcon,
  projects: ProjectsIcon,
  tasks: TasksIcon,
  plants: PlantsIcon,
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
  { id: 'plants', label: 'Plants' },
  { id: 'sms', label: 'SMS Campaigns' },
  { id: 'messages', label: 'Task Messages' },
];

const setActiveSection = (section) => {
  emit('update:activeSection', section);
  // Close mobile menu after selection
  isMobileMenuOpen.value = false;
  // Prevent body scroll when menu is open
  document.body.style.overflow = '';
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  // Prevent body scroll when menu is open
  if (isMobileMenuOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

// Close menu when clicking outside
const handleClickOutside = (event) => {
  const menu = event.target.closest('.mobile-menu-container');
  const button = event.target.closest('.hamburger-button');
  // Check if click is on the overlay (which already has its own click handler, but this ensures consistency)
  const overlay = event.target.closest('.mobile-menu-overlay');
  
  // If clicking outside menu, button, and not on overlay (overlay has its own handler), close the menu
  if (!menu && !button && !overlay && isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false;
    document.body.style.overflow = '';
  }
};

// Handle Escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false;
    document.body.style.overflow = '';
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('keydown', handleEscape);
  // Restore body scroll if menu was open
  document.body.style.overflow = '';
});
</script>

<template>
  <div>
    <!-- Hamburger Button (Mobile Only) - Absolute position in header -->
    <Teleport to="#garden-header">
      <button
        @click="toggleMobileMenu"
        class="hamburger-button lg:hidden absolute top-6 right-4 sm:right-6 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-lg shadow-lg transition-colors"
        aria-label="Toggle menu"
      >
        <div class="hamburger-icon" :class="{ 'is-active': isMobileMenuOpen }">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </div>
      </button>
    </Teleport>

    <!-- Mobile Menu Overlay -->
    <Teleport to="body">
      <div
        v-if="isMobileMenuOpen"
        class="mobile-menu-overlay lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        @click="toggleMobileMenu"
      ></div>
    </Teleport>

    <!-- Mobile Menu (Slide-in from right) -->
    <Teleport to="body">
      <aside
        v-if="isMobileMenuOpen"
        class="mobile-menu-container lg:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 bg-[rgba(26,26,26,0.95)] shadow-2xl overflow-y-auto"
      >
        <nav class="p-4 pt-16">
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
    </Teleport>

    <!-- Desktop Sidebar (unchanged) -->
    <aside class="hidden lg:block w-64 flex-shrink-0">
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
  </div>
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

/* Hamburger Menu Styles */
.hamburger-icon {
  width: 24px;
  height: 18px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger-line {
  width: 100%;
  height: 2px;
  background-color: #f5f5f5;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger-icon.is-active .hamburger-line:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger-icon.is-active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.hamburger-icon.is-active .hamburger-line:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Mobile Menu Animation */
.mobile-menu-container {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>

