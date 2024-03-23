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
      pattern: /bg-(red|green|blue|orange|purple|fuchsia|emerald|violet|indigo|yellow|lime|slate|bg-custom-light)-(100|500|700)/, // You can display all the colors that you need
    },
  ],
  }