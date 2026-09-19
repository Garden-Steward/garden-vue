/* eslint-disable no-undef */
const colors = require('tailwindcss/colors')

module.exports = {
   content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
   darkMode: 'class', // Use class-based dark mode for manual control
   theme: {
    extend: {
      height : {
        '30' : '30px',
      },
      colors: {
        lime: colors.lime,
        emerald: colors.emerald,
        fuchsia: colors.fuchsia,
        indigo: colors.indigo,
        violet: colors.violet,
        'custom-light': '#f7f1e3',
        'custom-lighter': '#f3ece0', // Lighter version of custom-light
        'primary': '#8aa37c',
        'custom-green': '#8aa37c',
        'darker-green': '#6c8a6a', // Slightly darker version of custom-green
        'darkest-green': '#376451', // Darkest green from logo
        // Manager / dark UI surfaces — prefer these over arbitrary bg-[#2d3e26] etc.
        //
        // Contrast ratios below are against white (#fff) for the surfaces, and
        // against forest.panel (#2d3e26) for the ink ramp. Anything carrying
        // text should clear WCAG AA (4.5:1 body, 3:1 large display).
        forest: {
          page: '#344a34', // gm-page dark, EventTemplates shell — 9.7:1 on white
          panel: '#2d3e26', // cards, body canvas dark — 11.5:1 on white
          border: '#3d4d36',
          // Page-title band. The old sage pair (darker-green → custom-green)
          // only reached 3.8:1 → 2.8:1 with white type, which failed AA even
          // for the display heading; this deeper pair is the readable offset.
          hero: '#376451', // 6.8:1 on white — same green as the logo mark
          'hero-end': '#2f5233', // 8.8:1 on white
          // Foreground ramp for type on forest.panel / forest.page.
          ink: '#f5f5f5', // 10.5:1 — headings, primary text
          'ink-muted': '#d0d0d0', // 7.5:1 — body copy, secondary labels
          'ink-subtle': '#a8b89e', // 5.5:1 — captions, helper text
        },
        'custom-peach': '#F9E2D1',
        'dark-orange': '#C2410C', // Dark orange for primary buttons
        // Add more custom colors here as needed
      },
      fontFamily: {
        'pacifico': ['Pacifico'],
        'montserrat': ['Montserrat'],
        'roboto': ['Roboto'],
        'righteous': ['Righteous'],
        'lato': ['Lato'],
        'raleway': ['Raleway'],
      }
    },
   },
   variants: {
     extend: {},
   },
   plugins: [],
   safelist: [
    {
      pattern: /bg-(red|green|blue|orange|purple|fuchsia|emerald|violet|indigo|yellow|lime|slate|bg-custom-light|bg-custom-green)-(100|500|600|700|800|900)/, // You can display all the colors that you need
    },
    // Dark mode custom colors
    'dark:bg-[#2d3e26]',
    'dark:bg-[#344a34]',
    'dark:bg-forest-page',
    'dark:bg-forest-panel',
    'dark:text-[#f5f5f5]',
    'dark:text-[#d0d0d0]',
    'dark:border-gray-600',
    'dark:hover:text-green-300',
  ],
  }