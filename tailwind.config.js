/* eslint-disable no-undef */
module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
   darkMode: 'media', // or 'media' or 'class'
   theme: {
    extend: {
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
 }