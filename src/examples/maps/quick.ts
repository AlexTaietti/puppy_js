import { CrawlMap } from "../../types/crawler";

export const quickMap: CrawlMap = {

   "http://www.useragentstring.com/pages/useragentstring.php?name=": {
      navigation: {
         selectors: ['li > a']
      }
   },

   "http://www.useragentstring.com/index.php?id=": {
      extraction: [{
         selector: "#uas_textfeld",
         label: 'ua_string'
      }]
   }

};