import { PuppeteerLifeCycleEvent, ElementHandle, Page } from 'puppeteer';
import _, { isArray, isString } from 'lodash';
import { Url } from '../../types/web';
import { EndConditionEvaluation, ExtractionSelectorProperties, PageOptions, LocationExtractionResult, SetupActionDescription } from '../../types/crawler';
import { applyOptions } from '../../utils';
import PageLogger from '../logging/PageLogger';

/**
* Basic class that contains methods and properties shared by the `BrutePage` and `CrawlerPage` classes
*/
class BasePage {

   private readonly id: string;
   private readonly minWait: number;
   private readonly maxWait: number;
   protected readonly endCondition: EndConditionEvaluation;
   protected readonly page: Page;
   protected readonly loading: PuppeteerLifeCycleEvent;
   protected readonly debug: boolean;
   protected readonly discreet: boolean;
   protected readonly logger: PageLogger;
   protected results: Array<LocationExtractionResult> = [];
   protected totalUrlsVisited = 0;

   constructor(page: Page, id: string, pageOptions?: PageOptions) {

      if (pageOptions.defaultTimeout) page.setDefaultTimeout(pageOptions.defaultTimeout);

      this.page = page;
      this.id = id;

      const defaultOptions: PageOptions = Object.seal({
         loading: "networkidle2",
         debug: false,
         discreet: false,
         minWait: 2000,
         maxWait: 5000,
         endCondition: undefined
      });

      const crawlerPageOptions = applyOptions(defaultOptions, pageOptions);
      Object.assign(this, crawlerPageOptions);

   }

   ////////////////
   // navigation //
   ////////////////

   /**
    * Visit the specified url and wait for the page to load (based on the page's loading style)
    */
   protected async goTo(url: Url) { await this.page.goto(url, { waitUntil: this.loading }); }

   /**
    * close this page
    */
   public async close() { await this.page.close(); }

   /**
    * prepare the page for interaction based on the info provided
    * by this page's map (runs before extraction, search and navigation)
    */
   public async handleSetup(setupInfo: Array<SetupActionDescription>) {

      for (let i = 0; i < setupInfo.length; i++) { // go through each setup entry iteratively

         const currentSetupEntry = setupInfo[i];

         if (currentSetupEntry.onlyOnce && currentSetupEntry.onlyOnce === 'done') continue;

         // @ts-ignore
         let interactionResult;

         try { //for each entry create a promise that will resolve once the html element has been interacted with successfully

            //will hold every promise relating to this setup interaction
            const actions: Array<Promise<any>> = [];

            //interact with all the matching html elements supplied in this setup entry object
            const mainActions = Promise.all(currentSetupEntry.selectors.map(async (actionSelector: string) => {
               const handle = await this.page.waitForSelector(actionSelector);
               return this.makeSelectorAction(handle, currentSetupEntry);
            }));

            //if waiting is necessary (e.g.: wait for ajax), wether a specific amount of ms or one of puppeteer defaults is supplied,
            //add a waiting instruction to the array containing all of the active promises before the actual mainActions promise
            if (currentSetupEntry.wait) { actions.push(isString(currentSetupEntry.wait) ? this.page.waitForNavigation({ waitUntil: currentSetupEntry.wait }) : this.page.waitForTimeout(currentSetupEntry.wait)); }

            actions.push(mainActions);

            //actually wait for all the DOM interactions
            interactionResult = await Promise.all(actions);

            this.logger.logSuccessfulSetupEntry(currentSetupEntry.type, this.page.url());

         } catch (error) {

            this.logger.logSetupEntryFailure(currentSetupEntry.type, this.page.url(), error);

         } finally {

            interactionResult = null; //free memory, save heaps

            if (currentSetupEntry?.onlyOnce) currentSetupEntry.onlyOnce = 'done';

         }

      }

      return this.page.url();

   }

   /**
    * Create a promise that resolves after Puppeteer has interacted with the DOM (used during setup)
    */
   private async makeSelectorAction(elementHandle: ElementHandle<Element>, setupObject: SetupActionDescription) {
      switch (setupObject.type) {
         case 'click':
            return elementHandle.click();
         case 'select':
            return elementHandle.select(setupObject.option);
      }
   }


   //////////////
   // scraping //
   //////////////

   /**
    * Wrapper for puppeteer's `page.$$` method
    */
   protected async extractHandles(selector: string) { return await this.page.$$(selector); }

   /**
    * Extract all iframes from page
    */
   protected async extractIframes() { return await this.page.$$('iframe'); }

   /**
    * Wrapper for puppeteer's `page.$` method
    */
   protected async extractHandle(selector: string) { return await this.page.$(selector); }

   /**
    * Wrapper for puppeteer's `page.$` method
    */
   protected async waitForSelectorInIframe(frame: ElementHandle<Element>, selector: string) {
      const frameContent = await frame.contentFrame();
      return await frameContent.waitForSelector(selector);
   }

   /**
  * Extract an attribute (e.g.: `href`) from the html element that matched the selector specified
  */
   protected async extractAttributeFrom(selector: string, attribute: string) { return await this.page.$eval(selector, (element, attributeName: string) => element.getAttribute(attributeName), attribute); }

   /**
    * Extracts the string value of an attribute (e.g.: `href`) from an `ElementHandle`
    */
   protected async extractAttributeFromHandle(handle: ElementHandle, attribute: string) { return await handle.evaluate(node => node.getAttribute(attribute)); }

   /**
    * Extracts the text contained inside an `ElementHandle`
    */
   protected async extractTextFromHandle(handle: ElementHandle) { return await handle.evaluate(element => element.textContent.trim()); }

   /**
    * Extracts the text contained inside all elements (nested in an iframe) that match the `selector` provided
    */
   protected async extractTextFromAllInIframe(frame: ElementHandle<Element>, selector: string, filterFunction: (data: string) => boolean, transformFunction: (data: string) => string) {
      const frameContent = await frame.contentFrame();
      let results = await frameContent.$$eval(selector, (elementList) => elementList.map(element => element.textContent.trim()));
      if (filterFunction) results = results.filter(data => filterFunction(data));
      if (transformFunction) results = results.map(data => transformFunction(data));
      return results;
   }

   /**
    * Extracts the specified attribute (e.g.: `href`) contained inside all elements (nested in an iframe) that match the `selector` provided
    */
   protected async extractAttributeFromAllInIframe(frame: ElementHandle<Element>, selector: string, attribute: string, filterFunction: (data: string) => boolean, transformFunction: (data: string) => string) {
      const frameContent = await frame.contentFrame();
      let results = await frameContent.$$eval(selector, (elementList, attributeName: string) => elementList.map(element => element.getAttribute(attributeName)), attribute);
      if (filterFunction) results = results.filter(data => filterFunction(data));
      if (transformFunction) results = results.map(data => transformFunction(data));
      return results;
   }

   /**
   * Extract an attribute (e.g.: `href`) from all the html elements that matched the selector specified
   */
   protected async extractAttributeFromAll(selector: string, attribute: string, filterFunction: (data: string) => boolean, transformFunction: (data: string) => string, parentTextConstraint: { selector: string, text: string }) {
      let results: string[] = [];
      if (parentTextConstraint) {
         results = await this.page.$$eval(parentTextConstraint.selector, (elementList, textConstraint: string, targetSelector: string, attributeName: string) => {
            const viableParents = Array.from(elementList).filter(element => element.textContent.includes(textConstraint) ? true : false);
            const resultsArray: string[] = [];
            viableParents.forEach(parent => {
               const currentTargets = parent.querySelectorAll(targetSelector);
               Array.from(currentTargets).forEach(targetElement => resultsArray.push(targetElement.getAttribute(attributeName)))
            });
            return resultsArray;
         }, parentTextConstraint.text, selector, attribute);
      } else {
         results = await this.page.$$eval(selector, (elementList, attributeName: string) => elementList.map(element => element.getAttribute(attributeName)), attribute);
      }
      if (filterFunction) results = results.filter(data => filterFunction(data));
      if (transformFunction) results = results.map(data => transformFunction(data));
      return results;
   }

   /**
   * Extract the text content of the html element that matched the selector specified
   */
   protected async extractTextFrom(selector: string) { return await this.page.$eval(selector, element => element.textContent.trim()); }

   /**
   * Extract the text content of all the html elements that matched the selector specified
   */
   protected async extractTextFromAll(selector: string, filterFunction: (data: string) => boolean, transformFunction: (data: string) => string, parentTextConstraint: { selector: string, text: string }) {
      let results: string[] = [];
      if (parentTextConstraint) {
         results = await this.page.$$eval(parentTextConstraint.selector, (elementList, textConstraint: string, targetSelector: string) => {
            const viableParents = Array.from(elementList).filter(element => element.textContent.includes(textConstraint) ? true : false);
            const resultsArray: string[] = [];
            viableParents.forEach(parent => {
               const currentTargets = parent.querySelectorAll(targetSelector);
               Array.from(currentTargets).forEach(targetElement => resultsArray.push(targetElement.textContent.trim()))
            });
            return resultsArray;
         }, parentTextConstraint.text, selector);
      } else {
         results = await this.page.$$eval(selector, elementList => elementList.map(element => element.textContent.trim()));
      }
      if (filterFunction) results = results.filter(data => filterFunction(data));
      if (transformFunction) results = results.map(data => transformFunction(data));
      return results;
   }

   /**
   * Extract the text content from the matching elements with complex structure (e.g.: tables)
   */
   protected async relativeTextExtraction(root: string, label: string, data: string) {

      return await this.page.evaluate((root, label, data) => {

         const roots = document.querySelectorAll(root);
         const results: { [label: string]: string[] } = {};

         roots.forEach((labelDataPairRoot: Element) => {
            const dataLabel = labelDataPairRoot.querySelector(label).textContent.trim(); // <-- we can only have a single label so we use "querySelector"
            const dataPoints = labelDataPairRoot.querySelectorAll(data);
            dataPoints.forEach((element: Element) => {
               const extractionResult: string[] = [];
               extractionResult.push(element.textContent.trim())
               results[dataLabel] = extractionResult;
            });
         });

         return results;

      }, root, label, data);

   }

   /**
   * Extract the specified attribute from the mathcing elements with complex structure (e.g.: tables)
   */
   protected async relativeAttributeExtraction(root: string, label: string, data: string, attribute: string) {

      return await this.page.evaluate((root, label, data, attribute) => {

         const roots = document.querySelectorAll(root);
         const results: { [label: string]: string[] } = {};

         roots.forEach((labelDataPairRoot: Element) => {
            const dataLabel = labelDataPairRoot.querySelector(label).textContent.trim(); // <-- we can only have a single label so we use "querySelector"
            const dataPoints = labelDataPairRoot.querySelectorAll(data);
            const extractionResult: string[] = [];
            dataPoints.forEach((element: Element) => extractionResult.push(element.getAttribute(attribute)));
            results[dataLabel] = extractionResult;
         });

         return results;

      }, root, label, data, attribute);

   }

   /**
   * Extract data from the current page based on the `extraction` property of this page's map
   */
   protected async extractData(pageDataSelectors: ExtractionSelectorProperties[]) {

      const url = this.page.url();
      let urlResults: LocationExtractionResult;

      for (let i = 0, booty; i < pageDataSelectors.length; i++) {

         const { selector, label, attribute, filterFunction, transformFunction, relative, parentTextConstraint } = pageDataSelectors[i];

         try {

            await this.page.waitForSelector(selector);

            if (!relative) {

               booty = attribute ? await this.extractAttributeFromAll(selector, attribute, filterFunction, transformFunction, parentTextConstraint) : await this.extractTextFromAll(selector, filterFunction, transformFunction, parentTextConstraint);

            } else {

               booty = attribute ? await this.relativeAttributeExtraction(selector, relative.label, relative.data, attribute) : await this.relativeTextExtraction(selector, relative.label, relative.data);
            }

            if (!urlResults) urlResults = { url };

            if (!label && !isArray(booty)) {

               urlResults = { ...urlResults, ...booty };

            } else { urlResults[label] = booty; }

            if (this.debug) this.logger.logDataExtracted(url, booty);

         } catch (error) {

            this.logger.logExtractionSelectorPropertiesNotFound(url, error, selector);
            continue;

         }

      }

      if (urlResults) this.results.push(urlResults);

   }


   ///////////
   // decoy //
   ///////////

   /**
    * Method used to wait a random amount of time between actions (needed to avoid getting blocked for spamming requests)
    */
   protected async wait() {
      const timeout = _.random(this.minWait, this.maxWait);
      await this.page.waitForTimeout(timeout);
   }


   ///////////////
   // page data //
   ///////////////
   public getId() { return this.id; }
   public getResults() { return this.results; }
   public getTotalUrls() { return this.totalUrlsVisited; }
   protected increaseUrlsVisitedCount() { this.totalUrlsVisited++; }


}

export default BasePage;