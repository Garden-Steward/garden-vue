/* eslint-disable no-undef */
const colors = require('tailwindcss/colors')

module.exports = {
   purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
   darkMode: 'media', // or 'media' or 'class'
   theme: {
    extend: {
      colors: {
        lime: colors.lime,
        emerald: colors.emerald,
        fuchsia: colors.fuchsia,
        indigo: colors.indigo,
        violet: colors.violet
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
      pattern: /bg-(red|green|blue|orange|purple|fuchsia|emerald|violet|indigo|yellow|lime|slate)-(100|500|700)/, // You can display all the colors that you need
    },
  ],
  }