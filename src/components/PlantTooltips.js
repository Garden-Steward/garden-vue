/**
 * PlantTooltips — Blog Content Plant Name Scanner
 *
 * Scans rendered blog content for connected plant names, wraps them in
 * interactive spans with a subtle background, shows botanical clipart on
 * hover, and opens the plant detail page on click.
 *
 * Usage:
 *   import { initPlantTooltips } from '@/components/PlantTooltips';
 *   const cleanup = initPlantTooltips(blog.plants);
 *   // later: cleanup();
 */

let activeTooltip = null;
let touchPlantId = null;

/**
 * Initialize plant name scanning inside a container element.
 * @param {Array} plants - Array of {id, title, latin, slug, clipart: {url}?}
 * @param {string} containerSelector - CSS selector for the content container
 * @returns {Function} cleanup function
 */
export function initPlantTooltips(plants, containerSelector = '.blog-content') {
  if (!plants || !plants.length) return () => {};

  const container = document.querySelector(containerSelector);
  if (!container) return () => {};

  // Normalize plants data (handle both flat array and Strapi relation format)
  const plantList = Array.isArray(plants)
    ? plants.map(p => (p.attributes ? { id: p.id, ...p.attributes } : p))
    : [];

  if (!plantList.length) return () => {};

  // Build name map sorted longest-first to avoid partial matches
  const nameMap = [];
  plantList.forEach(p => {
    if (p.title) nameMap.push({ name: p.title, plant: p });
    if (p.latin) nameMap.push({ name: p.latin, plant: p });
  });
  nameMap.sort((a, b) => b.name.length - a.name.length);

  // Scan text nodes and wrap matches
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  const replacements = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent;

    for (const entry of nameMap) {
      const idx = text.indexOf(entry.name);
      if (idx === -1) continue;

      const before = text.slice(0, idx);
      const after = text.slice(idx + entry.name.length);

      const span = document.createElement('span');
      span.className = 'plant-tooltip';
      span.dataset.plantId = String(entry.plant.id || '');
      span.dataset.plantSlug = entry.plant.slug || '';
      span.dataset.plantName = entry.name;
      span.textContent = entry.name;

      const fragment = document.createDocumentFragment();
      if (before) fragment.appendChild(document.createTextNode(before));
      fragment.appendChild(span);
      if (after) fragment.appendChild(document.createTextNode(after));

      node.parentNode.replaceChild(fragment, node);
      replacements.push(span);
      break; // only first match per text node
    }
  }

  if (!replacements.length) return () => {};

  // Create tooltip element (shared)
  const tooltip = document.createElement('div');
  tooltip.className = 'plant-tooltip-card';
  tooltip.style.cssText = `
    display: none;
    position: fixed;
    z-index: 10000;
    width: 220px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    overflow: hidden;
    pointer-events: none;
  `;
  document.body.appendChild(tooltip);

  /** Show tooltip for a given plant */
  function showTooltip(plant, x, y) {
    const clipartUrl = plant.clipart?.url
      ? (plant.clipart.url.startsWith('http')
          ? plant.clipart.url
          : `${import.meta.env.VITE_API_URL || ''}${plant.clipart.url}`)
      : null;

    tooltip.innerHTML = clipartUrl
      ? `<img src="${clipartUrl}" alt="${plant.title || ''}" style="width:100%;height:auto;display:block;aspect-ratio:1;object-fit:cover;">
         <div style="padding:10px;font-weight:600;font-size:14px;color:#2d3748;">${plant.title || plant.latin || ''}</div>`
      : `<div style="padding:16px;font-weight:600;font-size:14px;color:#2d3748;">${plant.title || plant.latin || ''}</div>`;

    // Position
    const cardW = 220;
    const viewW = window.innerWidth;
    let left = x + 12;
    let top = y + 12;
    if (left + cardW > viewW - 16) left = x - cardW - 12;
    if (top + tooltip.offsetHeight > window.innerHeight - 16) top = y - tooltip.offsetHeight - 12;
    tooltip.style.left = Math.max(8, left) + 'px';
    tooltip.style.top = Math.max(8, top) + 'px';
    tooltip.style.display = 'block';
  }

  /** Hide tooltip */
  function hideTooltip() {
    tooltip.style.display = 'none';
  }

  // Dark mode support via class observer
  const darkObserver = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains('dark');
    tooltip.style.background = isDark ? '#2d3748' : '#fff';
    const nameEl = tooltip.querySelector('div');
    if (nameEl) nameEl.style.color = isDark ? '#f5f5f5' : '#2d3748';
  });
  darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // Initial dark mode check
  if (document.documentElement.classList.contains('dark')) {
    tooltip.style.background = '#2d3748';
    const nameEl = tooltip.querySelector('div');
    if (nameEl) nameEl.style.color = '#f5f5f5';
  }

  // Attach events to each replacement span
  replacements.forEach(span => {
    const plantId = span.dataset.plantId;
    const plantSlug = span.dataset.plantSlug;
    const plant = plantList.find(p => String(p.id) === plantId) || plantList.find(p => p.slug === plantSlug);

    // Hover
    span.addEventListener('mouseenter', (e) => {
      if (touchPlantId !== null) return; // don't hover on touch devices while tooltip is shown
      if (plant) showTooltip(plant, e.clientX, e.clientY);
    });
    span.addEventListener('mousemove', (e) => {
      if (touchPlantId !== null) return;
      if (tooltip.style.display === 'block') {
        tooltip.style.left = Math.max(8, e.clientX + 12) + 'px';
        tooltip.style.top = Math.max(8, e.clientY + 12) + 'px';
      }
    });
    span.addEventListener('mouseleave', hideTooltip);

    // Click - open plant page in new tab
    span.addEventListener('click', (e) => {
      if (plantSlug) {
        window.open(`/manage/plant/${plantSlug}`, '_blank');
      }
    });

    // Touch
    span.addEventListener('touchstart', (e) => {
      if (touchPlantId === plantId) {
        // Second tap — open plant page
        if (plantSlug) window.open(`/manage/plant/${plantSlug}`, '_blank');
        touchPlantId = null;
        hideTooltip();
      } else {
        // First tap — show tooltip
        hideTooltip();
        touchPlantId = plantId;
        if (plant) showTooltip(plant, e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });
  });

  // Dismiss tooltip on click outside or scroll
  function dismissTouch(e) {
    if (touchPlantId !== null && !e.target.closest('.plant-tooltip')) {
      touchPlantId = null;
      hideTooltip();
    }
  }
  document.addEventListener('click', dismissTouch);
  document.addEventListener('scroll', () => { touchPlantId = null; hideTooltip(); }, { passive: true });

  // Inject styles once
  if (!document.getElementById('plant-tooltip-styles')) {
    const style = document.createElement('style');
    style.id = 'plant-tooltip-styles';
    style.textContent = `
      .plant-tooltip {
        background: rgba(108, 142, 91, 0.12);
        cursor: pointer;
        border-radius: 3px;
        padding: 1px 3px;
        transition: background-color 0.15s ease;
      }
      .plant-tooltip:hover {
        background: rgba(108, 142, 91, 0.25);
      }
      .dark .plant-tooltip {
        background: rgba(168, 213, 138, 0.15);
      }
      .dark .plant-tooltip:hover {
        background: rgba(168, 213, 138, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup
  return function cleanup() {
    replacements.forEach(span => {
      const parent = span.parentNode;
      if (parent) {
        const text = document.createTextNode(span.textContent || '');
        parent.replaceChild(text, span);
      }
    });
    if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
    darkObserver.disconnect();
    document.removeEventListener('click', dismissTouch);
  };
}
