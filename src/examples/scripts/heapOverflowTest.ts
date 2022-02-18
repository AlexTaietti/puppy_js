import Crawler from "../../classes/Crawler";
import { heapOverflowTestMap } from '../maps';
import { resultsFolder } from "../../config";
import { saveData } from "../../utils";

//Run goal: intensive run used to check whether memory is leaking or not
//(heap overflow used to be an issue at the beginning of the project)  
export const heapOverflowTest = async () => {

   const root = 'http://www.useragentstring.com/pages/useragentstring.php';
   const crawler = new Crawler({ headless: false });

   await crawler.initBrowser();
   await crawler.initPage('heapOverflowTest', root, heapOverflowTestMap, { loading: 'domcontentloaded', debug: true });

   const { results } = await crawler.scrapePageID('heapOverflowTest');

   saveData(resultsFolder, 'long_test', results);

   await crawler.squash();

};