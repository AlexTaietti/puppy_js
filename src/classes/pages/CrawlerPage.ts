import { Page } from 'puppeteer';
import _ from 'lodash';
import { Url } from '../../types/web';
import { PageOptions, CrawlMap, LocationExtractionState, LocationNavigationState, LocationSearchState, ExtractionSelectorProperties, TargetFilter, LocationExtractionResult } from '../../types/crawler';
import Locations from './Locations';
import BasePage from './BasePage';
import CrawlerPageLogger from '../logging/CrawlerPageLogger';

/**
* Page class used to recursively navigate through complex websites given a starting url.
*/
class CrawlerPage extends BasePage {

   private root: string;
   private readonly locations: Locations;
   private readonly map: CrawlMap;
   protected readonly logger: CrawlerPageLogger;

   constructor(page: Page, id: string, root: string, map: CrawlMap, pageOptions?: PageOptions) {
      super(page, id, pageOptions);
      this.root = root;
      this.map = map;
      this.locations = new Locations();
      this.logger = new CrawlerPageLogger(id);
   }


   ///////////
   // setup //
   ///////////

   /**
   * Match the current url to a set of actions extracted from the `CrawlerMap` supplied.
   */
   private getLocationActions(url: Url) {
      const urlFragments = Object.keys(this.map);
      const matchingFragment = urlFragments.find(fragment => {
         const fragmentExact = this.map[fragment].exact;
         const fragmentStart = this.map[fragment].starts;
         if (fragmentExact) return url === fragment;
         if (fragmentStart) return url.startsWith(fragment);
         return url.includes(fragment);
      });
      return this.map[matchingFragment];
   }

   /**
   * Create a more detailed set of instructions based on the map's `search` property.
   */
   private makeSearchData(searchData: { selector: string[], inputs: (string | string[])[] }): LocationSearchState {
      return {
         selector: [...searchData.selector],
         inputs: [...searchData.inputs],
         exhaustedInputs: [],
         exhausted: false
      };
   }

   /**
   * Create a more detailed set of instructions based on the map's `navigation` property.
   */
   private async makeNavigationData(navigationData: { selectors: string[], targetFilter?: TargetFilter }, url: Url): Promise<LocationNavigationState> {

      try {

         const selectorsDataObjects = (await Promise.all(navigationData.selectors.map(async selector => {

            const numberOfHandles = await this.extractNumberOfHandles(selector);

            if (!numberOfHandles) {
               this.logger.logNoViableHandlesFoundForSelector(url, selector);
               return null;
            }

            return {
               selector: selector,
               available: [...Array(numberOfHandles).keys()], // create an array containing all the indexes of the navigable handles
               explored: []
            };

         }))).filter(selector => selector !== null);

         if (!selectorsDataObjects.length) { throw new Error('Could not create a navigation state object') } // throw if no usable navigation handlers have been found

         return {
            targetFilter: navigationData.targetFilter,
            activeSelectorIndex: _.random(0, selectorsDataObjects.length - 1),
            navigationSelectors: selectorsDataObjects,
            exhaustedNavigationSelectors: [],
            exhausted: false
         };

      } catch (error) { this.logger.logNoViableHandlesFound(url, error); }

   }

   /**
   * Create a more detailed set of instructions based on the map's `extraction` property.
   */
   private makeExtractionData(extractionData: Array<ExtractionSelectorProperties>): LocationExtractionState {
      return {
         dataSelectors: [...extractionData],
         dataExtracted: false
      };
   }

   /**
   * Match a url to a url fragment specified in the page's map and generate a detailed set of actions used to interact with the current document.
   */
   private async initLocation() {

      let locationUrl = this.page.url();
      let urlAfterSetup;
      const locationState = this.locations.getLocationState(locationUrl);

      if (locationState) return { extraction: locationState.extraction, search: locationState.search };

      const locationHooks = this.getLocationActions(locationUrl);

      if (locationHooks?.setup) urlAfterSetup = await this.handleSetup(locationHooks.setup);

      if (urlAfterSetup && locationUrl !== urlAfterSetup) {
         if (locationUrl === this.root) this.root = urlAfterSetup;
         locationUrl = urlAfterSetup;
      }

      this.logger.logNewLocationReached(locationUrl); // a little bit of logging so we know where we are at this point in the run

      this.increaseUrlsVisitedCount();

      let navigation: LocationNavigationState = undefined;
      let extraction: LocationExtractionState = undefined;
      let search: LocationSearchState = undefined;

      if (locationHooks?.search) search = this.makeSearchData(locationHooks.search);
      if (locationHooks?.navigation) navigation = await this.makeNavigationData(locationHooks.navigation, locationUrl);
      if (locationHooks?.extraction) extraction = this.makeExtractionData(locationHooks.extraction);

      this.locations.setLocationState(locationUrl, { navigation, extraction, search });

      return { extraction, search };

   }


   ////////////////
   // navigation //
   ////////////////

   /**
   * Return to the last url and crawl it once more (pick up where we left off on the last visit).
   */
   private async goBack() {
      await this.page.goBack({ waitUntil: this.loading });
      return await this.crawlLocation();
   }

   /**
   * Head to the page's root url before starting the run.
   */
   private async goToRoot() {
      await this.goTo(this.root);
      const currentUrl = this.page.url();
      if (currentUrl !== this.root) this.root = currentUrl; // done in case any redirection occurs at the root of the run
   }

   /**
   * Handle the navigation at the current location.
   */
   private async handleNavigation() {

      const url = this.page.url();
      const locationState = this.locations.getLocationState(url);

      if (url === 'about:blank') { this.logger.logUpdate("I should never be printed, if you are seeing me there must be a bug on the loose"); return this.getResults(); } //this should NEVER happen

      if (!locationState.navigation) return url === this.root ? this.getResults() : await this.goBack();
      if (locationState.navigation.exhausted) return url === this.root ? this.getResults() : await this.goBack();

      const currentNavigationSelector = this.locations.getActiveNavigationSelector(url);

      try {

         await this.page.waitForSelector(currentNavigationSelector);

      } catch (error) {

         this.logger.logHandleNotFound(url, error, currentNavigationSelector);
         this.locations.navigationSelectorExhausted(url);
         return await this.crawlLocation();

      }

      const currentNavigationHandleIndex = this.locations.pickRandomAvailableActiveSelectorIndex(url);
      const allNavigationHandles = await this.extractHandles(currentNavigationSelector);
      const nextTarget = allNavigationHandles[currentNavigationHandleIndex];

      let nextUrl = await nextTarget.evaluate(anchor => anchor.getAttribute('href'));
      if (!nextUrl) return await this.crawlLocation();

      if (this.endCondition && this.endCondition({ nextNavigationTarget: nextUrl })) return this.getResults();

      if (locationState.navigation.targetFilter) {

         if (locationState.navigation.targetFilter.include) {

            for (let i = 0; i < locationState.navigation.targetFilter.include.length; i++) {
               const inclusionString = locationState.navigation.targetFilter.include[i];
               if (!nextUrl.includes(inclusionString)) return await this.crawlLocation();
            }

         }

         if (locationState.navigation.targetFilter.exclude) {

            for (let i = 0; i < locationState.navigation.targetFilter.exclude.length; i++) {
               const exclusionString = locationState.navigation.targetFilter.exclude[i];
               if (nextUrl.includes(exclusionString)) return await this.crawlLocation();
            }

         }

      }

      // @ts-ignore
      let clickResult;

      try {

         const currentOrigin = await this.page.evaluate(() => location.origin);
         let newOrigin = false;

         if (nextUrl.startsWith('http') && !nextUrl.includes(currentOrigin)) { newOrigin = true; }

         if (this.debug) this.logger.logNavigationProgressionAtUrl(url, this.locations);

         clickResult = await Promise.all(

            newOrigin ? // this check is needed in order to avoid a race condition caused by puppeteer (https://github.com/puppeteer/puppeteer/issues/3338)

               [
                  nextTarget.evaluate((anchor: HTMLElement) => anchor.click()),
                  this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).then(() => this.page.waitForNavigation({ waitUntil: 'networkidle0' }))
               ]
               :
               [
                  nextTarget.evaluate((anchor: HTMLElement) => anchor.click()),
                  this.page.waitForNavigation({ waitUntil: this.loading })
               ]

         );

      } catch (error) {

         this.logger.logNavigationHandleClickError(url, error, currentNavigationHandleIndex, currentNavigationSelector);

      } finally {

         clickResult = null; //free memory, save heaps
         return await this.crawlLocation();

      }

   }


   ////////////
   // search //
   ////////////

   /**
   * Handle the search at the current location.
   */
   private async handleSearch() { //TODO: refactor how multiple input fields are handled

      const url = this.page.url();
      const searchFieldSelector = this.locations.getSearchFieldSelector(url);
      const [inputString, stringNumber, totalInputs] = this.locations.getNextSearchString(url);

      this.logger.logSearchProgression(url, stringNumber, totalInputs);

      // @ts-ignore
      let enterPressResult;

      for (let i = 0; i < searchFieldSelector.length; i++) {
         const targetFieldInputValue = await this.page.$eval(searchFieldSelector[i], (input: HTMLInputElement) => input.value); // } <-- these 2 lines clear an input field if needed
         if (targetFieldInputValue.length) await this.page.click(searchFieldSelector[i], { clickCount: 3 });                    // }
         const searchString = Array.isArray(inputString) ? inputString[i] : inputString;
         await this.page.type(searchFieldSelector[i], searchString, { delay: this.discreet ? 100 : 0 });
      }

      try {

         enterPressResult = await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
            this.page.keyboard.press('Enter', { delay: this.discreet ? 20 : 0 })
         ]);

      } catch (error) {

         this.logger.logSearchFailure(url, inputString, error);

      } finally {

         enterPressResult = null; //free memory, save heaps
         return await this.crawlLocation();

      }

   }


   //////////////
   // scraping //
   //////////////

   /**
   * Extract data from the current location.
   */
   private async extractBooty() {
      const url = this.page.url();
      const extractionData = this.locations.getLocationExtractionData(url);
      await this.extractData(extractionData);
      this.locations.setExtracted(url);
   }

   /**
   * Given a selector return the number of nodes that match it in the current document.
   */
   private async extractNumberOfHandles(selector: string) { return (await this.extractHandles(selector)).length; }

   /**
    * The page's main function (recursively called).
    */
   private async crawlLocation(): Promise<Array<LocationExtractionResult>> {

      if (this.discreet) await this.wait();

      if (this.endCondition && this.endCondition({ currentUrl: this.page.url(), results: this.results })) return this.getResults();

      const { extraction, search } = await this.initLocation();

      if (extraction && !extraction.dataExtracted) await this.extractBooty();
      if (search && !search.exhausted) return await this.handleSearch();

      return await this.handleNavigation();

   }

   /**
    * Run the page and return a result object containing its id and the data extracted along the way.
    */
   public async scrape() {

      await this.goToRoot();
      this.logger.logRunStart(this.root);

      try {

         const results = await this.crawlLocation();
         if (results.length) return { id: this.getId(), results };
         throw new Error(`No data was extracted`);

      } catch (error) {

         this.logger.logRunFailure(error);
         return { id: this.getId(), results: null };

      }

   }

}

export default CrawlerPage;