import Crawler from "../../classes/Crawler";
import { quickMap } from '../maps';
import { resultsFolder } from "../../config";
import { saveData } from "../../utils";

//Run goal: extremely quick run used to make sure that basic funcionality is not broken (basically a test)
export const quick = async () => {

   const root = 'http://www.useragentstring.com/pages/useragentstring.php?name=Accoona-AI-Agent';
   const crawler = new Crawler({ headless: false });

   await crawler.initBrowser();
   await crawler.initPage('quick', root, quickMap, { loading: 'domcontentloaded', debug: true });

   const { results } = await crawler.scrapePageID('quick');

   saveData(resultsFolder, 'quick', results);

   await crawler.squash();

};