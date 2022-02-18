import { CrawlMap } from "../../types/crawler";

export const heapOverflowTestMap: CrawlMap = {

   "http://www.useragentstring.com/pages/useragentstring.php?name=": {
      navigation: {
         selectors: ['li > a']
      }
   },

   "http://www.useragentstring.com/pages/useragentstring.php": {
      navigation: {
         selectors: [".unterMenuName"]
      }
   },

   "http://www.useragentstring.com/index.php?id=": {
      extraction: [{
         selector: "#uas_textfeld",
         label: 'ua_string'
      }]
   }

};