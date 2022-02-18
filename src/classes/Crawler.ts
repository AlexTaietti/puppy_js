import puppeteer from 'puppeteer-extra';
import { Browser } from 'puppeteer';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { applyOptions } from '../utils';
import { CrawlerOptions, PageOptions, CrawlMap, BrutePageOptions, LocationExtractionResult, ExtractionSelectorProperties } from '../types/crawler';
import CrawlerPage from './pages/CrawlerPage';
import BrutePage from './pages/BrutePage';
import CrawlerLogger from './logging/CrawlerLogger';

puppeteer.use(stealthPlugin());

/**
* Class that manages every `page` instance.
*/
class Crawler {

   private pages: Array<CrawlerPage | BrutePage> = [];
   private browser: Browser = null;
   private totalUrlsVisited = 0;
   private logger = new CrawlerLogger('Crawler');
   private readonly headless: boolean = true;
   private readonly failedRuns: string[] = [];

   ///////////
   // setup //
   ///////////
   constructor(options: CrawlerOptions = {}) {

      const defaultOptions: CrawlerOptions = {
         headless: true,
         resultsFolder: 'results'
      };

      const crawlerOptions = applyOptions(defaultOptions, options);
      Object.assign(this, crawlerOptions);

   }

   /**
   * Create a puppeteer browser instance and tie it to this `Crawler`.
   */
   public async initBrowser() {
      // @ts-ignore <-- needed because of typing issues in puppeteer (https://github.com/berstend/puppeteer-extra/issues/428)
      this.browser = await puppeteer.launch({
         args: ['--single-process', '--no-sandbox', '--no-zygote'],
         defaultViewport: { width: 1920, height: 1080 }, // <-- the most popular desktop viewport size (20% of desktops, accoring to https://gs.statcounter.com/screen-resolution-stats)
         headless: this.headless
      });
   }

   /**
   * Create a `CrawlerPage` instance (used for more complex recursive scraping).
   */
   public async initPage(id: string, root: string, map: CrawlMap, pageOptions: PageOptions = {}) {
      const page = await this.browser.newPage();
      const newPage = new CrawlerPage(page, id, root, map, pageOptions);
      this.pages.push(newPage);
   }

   /**
   * Create a `BrutePage` instance (used for simpler, faster scraping).
   */
   public async initBrutePage(id: string, targets: string[], selectors: Array<ExtractionSelectorProperties>, pageOptions: BrutePageOptions = {}) {
      const page = await this.browser.newPage();
      const newPage = new BrutePage(page, id, targets, selectors, pageOptions);
      this.pages.push(newPage);
   }


   //////////////
   // scraping //
   //////////////

   /**
   * Run every page in the crawler's list simultaneously.
   */
   public async scrapeAll() {

      const resultsArray = await Promise.all(this.pages.map(async page => {

         const pageResultsObject = await page.scrape();

         try {

            await page.close();

         } catch (error) {

            this.logger.logPageCloseError(pageResultsObject.id, error);

         } finally {

            const pageVisitedUrls = page.getTotalUrls();
            this.totalUrlsVisited += pageVisitedUrls;

            if (pageResultsObject.results) {

               this.logger.logPageRunSuccess(pageResultsObject.id, pageVisitedUrls);

            } else { this.failedRuns.push(pageResultsObject.id); }

            return pageResultsObject;
         }

      }));

      if (this.failedRuns.length) {

         if (this.failedRuns.length === this.pages.length) {
            this.logger.logMultiRunCompleteFailure();
            return null;
         }

         this.logger.logMultiRunPartialSuccess(this.totalUrlsVisited);

      } else { this.logger.logMultiRunCompleteSuccess(this.totalUrlsVisited); }

      return this.makeResults(resultsArray);

   }

   private getPageByID(id: string) { return this.pages.find(page => page.getId() === id); }

   /**
   * Find a page by `id`and run it (returns an object containing the page's id and its results object).
   */
   public async scrapePageID(id: string) {

      const page = this.getPageByID(id);
      const pageResultsObject = await page.scrape();

      try {

         await page.close();

      } catch (error) { this.logger.logPageCloseError(pageResultsObject.id, error); }

      if (pageResultsObject.results) { this.logger.logPageRunSuccess(id, page.getTotalUrls()); }

      return pageResultsObject;

   }

   /**
   * Create a result object after running `scrapeAll`.
   */
   private makeResults(resultsArray: { id: string; results: Array<LocationExtractionResult>; }[]) {
      return resultsArray.reduce((results: { [pageID: string]: Array<LocationExtractionResult> }, resultObject) => {
         results[resultObject.id] = resultObject.results;
         return results;
      }, {});
   }


   ////////////////////
   // crawler vitals //
   ////////////////////

   /**
   * close the browser.
   */
   public async squash() {

      if (this.browser) await this.browser.close();

   }


}

export default Crawler;