import Crawler from "../../classes/Crawler";
import { resultsFolder } from "../../config";
import { recipesMap } from '../maps';
import { saveData } from "../../utils";

//Run goal: extract recipes from a website (one of the first exmaple scripts)
export const recipes = async () => {

   const root = 'https://www.bbc.co.uk/food/collections/7_simple_salmon_suppers';
   const crawler = new Crawler({ headless: false });

   await crawler.initBrowser();
   await crawler.initPage('food', root, recipesMap, { discreet: true, loading: 'domcontentloaded' });

   const { results } = await crawler.scrapePageID('food');

   saveData(resultsFolder, 'recipes', results);

   await crawler.squash();

};