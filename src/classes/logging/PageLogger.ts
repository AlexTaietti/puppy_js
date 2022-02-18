import Logger from "./Logger";
import { Url } from "../../types/web";

class PageLogger extends Logger {

   constructor(prefix?: string) {
      super(prefix);
   }

   public logExtractionSelectorPropertiesNotFound(url: Url, error: Error, selector: string) {
      const urlString = this.makeCyanInErrorMessage(url);
      const selectorName = this.makeYellowInErrorMessage(selector);
      this.logError(`I tried to wait for any ${selectorName} but I found none @ ${urlString} so I'm skipping it -> ${error.stack}`);
   }

   public logDataExtracted(url: Url, data: (string[] | { [label: string]: string[] })) {
      const dataString = Array.isArray(data) ? this.makeGreen(JSON.stringify(data, null, 3)) : this.makeGreen(JSON.stringify(data, null, 3));
      this.log(`I found this thing you wanted 👉 ${dataString} 👈 @ ${this.makeCyan(url)}`);
   }

   public logExtractionFailed(url: Url) {
      const urlString = this.makeCyanInErrorMessage(url);
      this.logError(`Unable to extract data from ${urlString}`);
   }

   public logRequestFailure(url: Url, error: Error) {
      const urlString = this.makeCyanInErrorMessage(url);
      this.logError(`Failure while requesting ${urlString} -> ${error.stack}`);
   }

   public logSuccessfulSetupEntry(setupType: string, url: Url) {
      const typeString = this.makeYellowInSuccessMessage(setupType);
      const urlString = this.makeCyanInErrorMessage(url);
      this.logSuccess(`Successfully completed ${typeString} setup @ ${urlString}`);
   }

   public logSetupEntryFailure(setupType: string, url: Url, error: Error) {
      const typeString = this.makeYellowInErrorMessage(setupType);
      const urlString = this.makeCyanInErrorMessage(url);
      this.logError(`Could not complete ${typeString} setup @ ${urlString} -> ${error}`);

   }

}

export default PageLogger;