import { CrawlMap } from "../../types/crawler";

export const searchTestMap: CrawlMap = {

   "https://en.wikipedia.org/wiki/Main_Page": {
      search: { selector: ['#searchInput'], inputs: ['lionel messi', 'cristiano ronaldo', 'pelè', 'maradona'] }
   },

   "https://en.wikipedia.org/wiki": {
      extraction: [{
         selector: "table + p",
         label: 'info'
      }]
   }

};