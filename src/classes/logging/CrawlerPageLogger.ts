import PageLogger from "./PageLogger";
import { Url } from "../../types/web";
import Locations from "../pages/Locations";

class CrawlerPageLogger extends PageLogger {

   constructor(prefix?: string) {
      super(prefix);
   }

   public logNoViableHandlesFound(url: Url, error: Error) {
      const urlString = this.makeCyanInErrorMessage(url);
      this.logError(`No viable navigation handles @ ${urlString} -> ${error.stack}`);
   }

   public logNoViableHandlesFoundForSelector(url: Url, selector: string) {
      const urlString = this.makeCyanInErrorMessage(url);
      const selectorString = this.makeYellowInErrorMessage(selector);
      this.logError(`I am @ ${urlString} but I cannot locate any ${selectorString} so I'll skip it`);
   }

   public logNavigationHandleClickError(url: Url, error: Error, selectorIndex: number, selector: string) {
      const urlString = this.makeCyanInErrorMessage(url);
      const index = this.makeYellowInErrorMessage(selectorIndex);
      const selectorName = this.makeYellowInErrorMessage(selector);
      this.logError(`I am @ ${urlString} I tried clicking the element with selector ${selectorName} and index ${index} but failed, so I am retrying with a new index -> ${error.stack}`);
   }

   public logHandleNotFound(url: Url, error: Error, selector: string) {
      const urlString = this.makeCyanInErrorMessage(url);
      const selectorName = this.makeYellowInErrorMessage(selector);
      this.logError(`I tried to wait for any ${selectorName} but I found none @ ${urlString} I'm going back -> ${error.stack}`);
   }

   public logNavigationProgressionAtUrl(url: Url, pageLocations: Locations) {
      const [percentage, total] = pageLocations.getPercentageOfVisitedHandles(url);
      const percentageExplored = this.makeGreen(`${percentage}%`);
      const totalHandles = this.makeGreen(total);
      const locationUrl = this.makeCyan(url);
      this.log(`Navigating to a new location, ${percentageExplored} of ${totalHandles} total navigation handles explored so far @ ${locationUrl}`);
   }

   public logRunStart(root: string) {
      const urlString = this.makeCyan(root);
      this.log(`starting run @ ${urlString}`);
   }

   public logRunFailure(error: Error) { this.logError(`run failed -> ${error.stack}`); }

   public logSearchFailure(url: Url, inputString: string | string[], error: Error) {
      const input = Array.isArray(inputString) ? JSON.stringify(inputString, null, 3) : inputString;
      const inputPrinted = this.makeGreenInErrorMessage(input);
      const urlString = this.makeCyanInErrorMessage(url);
      this.logError(`Search failed for ${inputPrinted} @ ${urlString} -> ${error.stack}`);
   }

   public logSearchProgression(url: Url, inputStringNumber: number, totalInputs: number) {
      const inputNumber = this.makeYellow(inputStringNumber);
      const totalInputsString = this.makeYellow(totalInputs);
      const urlString = this.makeCyan(url);
      this.log(`Searching using string number ${inputNumber} out of ${totalInputsString} @ ${urlString}`);
   }

   public logNewLocationReached(url: Url) {
      const urlString = this.makeCyan(url);
      this.log(`Now visiting ${urlString}`);
   }

}

export default CrawlerPageLogger;