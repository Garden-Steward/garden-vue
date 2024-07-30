import { nextTick } from 'vue';

export const ArticleUtils = {

  processImages: async () => {
    console.log('processing images');
    await nextTick();
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      console.log(img.alt)
      if (img.alt.includes('float-right')) {
        img.classList.add('float-right');
      }
      if (img.alt.includes('float-left')) {
        img.classList.add('float-left');
      }
      if (img.alt.includes('center')) {
        img.classList.add('mx-auto', 'block');
      }
      if (img.alt.includes('w300')) {
        img.classList.add('w300');
      }
    });
  },

};

export default ArticleUtils;