import { Page } from 'puppeteer';
import _ from 'lodash';
import { ExtractionSelectorProperties, BrutePageOptions, SetupActionDescription } from '../../types/crawler';
import { Url } from '../../types/web';
import BasePage from './BasePage';
import BrutePageLogger from '../logging/BrutePageLogger';

/**
* Page class used to quickly iterate over an array of urls and extract data from each location
*/
class BrutePage extends BasePage {

   private readonly targets: Url[];
   private readonly extractionSelectors: Array<ExtractionSelectorProperties>;
   private readonly pageSetup: Array<SetupActionDescription>;
   protected readonly logger: BrutePageLogger;

   constructor(page: Page, id: string, targets: Url[], extractionSelectors: Array<ExtractionSelectorProperties>, pageOptions?: BrutePageOptions) {
      super(page, id, pageOptions);
      this.logger = new BrutePageLogger(id);
      this.pageSetup = pageOptions.setup ? pageOptions.setup : null;
      this.targets = targets;
      this.extractionSelectors = extractionSelectors;
   }

   ////////////////
   // navigation //
   ////////////////

   /**
   * Request a new url
   */
   private async visitPage(url: Url) {

      try {

         await this.goTo(url);
         this.increaseUrlsVisitedCount();

      } catch (error) { throw new Error(`Could not establish connection`); }

   }

   /**
   * Blast through the urls supplied
   */
   public async scrape() {

      try {

         this.logger.logRunStart();

         for (let i = 0; i < this.targets.length; i++) {

            const currentUrl = this.targets[i];

            try {

               await this.visitPage(currentUrl);
               if (this.pageSetup) await this.handleSetup(this.pageSetup);

            } catch (error) {

               this.logger.logRequestFailure(currentUrl, error);
               continue;

            }

            if (this.discreet) await this.wait();

            try {

               this.logger.logRunProgression(i, this.targets.length);
               await this.extractData(this.extractionSelectors);

            } catch (error) {

               this.logger.logExtractionFailed(this.targets[i]);
               continue;

            }

         }

         const results = this.getResults();
         if (results.length) return { id: this.getId(), results };
         throw new Error(`No data could be extracted`);

      } catch (error) {

         this.logger.logRunFailure(error);
         return { id: this.getId(), results: null };

      }

   }


}

export default BrutePage;