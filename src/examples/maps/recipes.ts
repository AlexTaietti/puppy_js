import { CrawlMap } from "../../types/crawler";

export const recipesMap: CrawlMap = {

   "https://www.bbc.co.uk/food/collections/": {
      navigation: {
         selectors: ['.promo__main_course']
      }
   },

   "https://www.bbc.co.uk/food/recipes/": {
      extraction: [{
         selector: ".content-title__text",
         label: 'title'
      }, {
         selector: ".recipe-ingredients__list-item",
         label: 'ingredients'
      }, {
         selector: ".recipe-method__list-item-text",
         label: 'method'
      }]
   }

};