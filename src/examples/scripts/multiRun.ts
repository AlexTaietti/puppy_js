import Crawler from "../../classes/Crawler";
import { resultsFolder } from "../../config";
import { recipesMap, searchTestMap } from '../maps';
import { saveData } from "../../utils";

//Run goal: Run multiple pages simultaneously
//(this works properly only in headless mode, without it the pages would steal each other's focus interrupting interactions with whatever page they are on)
export const multiRun = async () => {

   const bruteRunTargets = [
      "http://www.useragentstring.com/index.php?id=14140",
      "http://www.useragentstring.com/index.php?id=14139",
      "http://www.useragentstring.com/index.php?id=9760",
      "http://www.useragentstring.com/index.php?id=1390",
      "http://www.useragentstring.com/index.php?id=4987",
      "http://www.useragentstring.com/index.php?id=7091",
      "http://www.useragentstring.com/index.php?id=7089",
      "http://www.useragentstring.com/index.php?id=7184",
      "http://www.useragentstring.com/index.php?id=13886",
      "http://www.useragentstring.com/index.php?id=18101",
      "http://www.useragentstring.com/index.php?id=7088",
      "http://www.useragentstring.com/index.php?id=18100",
      "http://www.useragentstring.com/index.php?id=320",
      "http://www.useragentstring.com/index.php?id=11345",
      "http://www.useragentstring.com/index.php?id=1450",
      "http://www.useragentstring.com/index.php?id=8888",
      "http://www.useragentstring.com/index.php?id=8000"
   ];

   const crawler = new Crawler({ headless: true }); //as of 08/11 concurrent runs only work smoothly when headless is set to true (https://github.com/puppeteer/puppeteer/issues/2656) & (https://github.com/puppeteer/puppeteer/issues/3318)
   await crawler.initBrowser();

   //initalize 3 pages
   await crawler.initBrutePage('brute', bruteRunTargets, [{

      selector: "#uas_textfeld",
      label: 'ua_string',

   }], { loading: 'domcontentloaded' });
   await crawler.initPage('wiki', 'https://en.wikipedia.org/wiki/Main_Page', searchTestMap, { discreet: true, loading: 'networkidle0' });
   await crawler.initPage('food', 'https://www.bbc.co.uk/food/collections/7_simple_salmon_suppers', recipesMap, { discreet: true, loading: 'domcontentloaded' });

   //scrape it all
   const multiResult = await crawler.scrapeAll();

   saveData(resultsFolder, 'multi_result', multiResult);

   await crawler.squash();

};