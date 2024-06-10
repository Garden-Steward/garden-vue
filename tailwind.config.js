/* eslint-disable no-undef */
const colors = require('tailwindcss/colors')

module.exports = {
   purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
   darkMode: 'media', // or 'media' or 'class'
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
        'custom-peach': '#F9E2D1',
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
      pattern: /bg-(red|green|blue|orange|purple|fuchsia|emerald|violet|indigo|yellow|lime|slate|bg-custom-light|bg-custom-green)-(100|500|700)/, // You can display all the colors that you need
    },
  ],
  }