import PageLogger from "./PageLogger";

class CrawlerLogger extends PageLogger {

   constructor(prefix?: string) {
      super(prefix);
   }

   public logPageCloseError(pageID: string, error: Error) {
      const id = this.makeYellowInErrorMessage(pageID);
      this.logError(`So close yet so far: failed when attempting to close the page with id ${id} (its results have been returned safely) -> ${error.stack}`);
   }

   public logPageRunSuccess(id: string, pageUrlsVisited: number) {
      const pageID = this.makeYellowInSuccessMessage(id);
      const visitedAmount = this.makeYellowInSuccessMessage(pageUrlsVisited);
      this.logSuccess(`The page with id ${pageID} completed its run successfully! 🎉 it explored a total of ${visitedAmount} urls along the way`);
   }

   public logMultiRunCompleteSuccess(urlsVisited: number) {
      const totalUrlsVisited = this.makeYellowInSuccessMessage(urlsVisited);
      this.logSuccess(`The run was 100% successful! 🎉 The crawler visited a total of ${totalUrlsVisited} urls`);
   }

   public logMultiRunCompleteFailure() { this.logSuccess(`The run was a complete failure, check the configuration & page maps and retry`); }

   public logMultiRunPartialSuccess(urlsVisited: number) {
      const totalUrlsVisited = this.makeYellowInSuccessMessage(urlsVisited);
      this.logUpdate(`The run was partially successful, the crawler visited a total of ${totalUrlsVisited} urls`);
   }

}

export default CrawlerLogger;