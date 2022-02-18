// test script
import Crawler from "../../classes/Crawler";
import { searchTestMap } from '../maps';
import { resultsFolder } from "../../config";
import { saveData } from "../../utils";

//Run goal: extract data from wikipedia using their search field
export const searchTest = async () => {

   const root = 'https://en.wikipedia.org/wiki/Main_Page';
   const crawler = new Crawler({ headless: false });

   await crawler.initBrowser();
   await crawler.initPage('wiki', root, searchTestMap, { discreet: true, debug: true, loading: 'networkidle0' });
   const { results } = await crawler.scrapePageID('wiki');

   saveData(resultsFolder, 'wiki', results);

   await crawler.squash();

};