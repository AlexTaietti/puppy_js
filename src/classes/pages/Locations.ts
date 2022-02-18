import _ from "lodash";
import { LocationData } from "../../types/crawler";
import { Url } from "../../types/web";

/**
* Class used to manipulate a `CrawlerPage`'s instance history (search, navigation and data extraction progression at each location).
*/
class Locations {

   private locations: { [url: string]: LocationData } = {};

   public getLocationsHistory() { return this.locations; }
   public getLocationState(url: Url) { return this.locations[url]; }
   public setLocationState(url: Url, state: LocationData) { this.locations[url] = state; }


   /////////////////////
   // data extraction //
   /////////////////////
   public setExtracted(url: Url) { this.getLocationExtractionState(url).dataExtracted = true; }
   private getLocationExtractionState(url: Url) { return this.getLocationState(url).extraction; }
   public getLocationExtractionData(url: Url) { return [...this.getLocationExtractionState(url).dataSelectors]; }


   //////////////////////
   // input and search //
   //////////////////////
   private getLocationSearchState(url: Url) { return this.getLocationState(url).search; }
   public getSearchFieldSelector(url: Url) { return this.getLocationSearchState(url).selector; }
   public setSearchExhausted(url: Url) { return this.getLocationSearchState(url).exhausted = true; }

   public getNextSearchString(url: Url): [string | string[], number, number] {
      const searchState = this.getLocationSearchState(url);
      const nextInput = searchState.inputs.shift();
      searchState.exhaustedInputs.push(nextInput);
      const inputNumber = searchState.exhaustedInputs.length;
      const totalInputs = inputNumber + searchState.inputs.length;
      if (!searchState.inputs.length) this.setSearchExhausted(url);
      return [nextInput, inputNumber, totalInputs];
   }


   ////////////////
   // navigation //
   ////////////////
   private getLocationNavigationState(url: Url) { return this.getLocationState(url).navigation; }

   public navigationSelectorExhausted(url: Url) {

      const locationNavigationState = this.getLocationNavigationState(url);
      const locationCurrentNavigationSelectorIndex = locationNavigationState.activeSelectorIndex;
      const exhaustedSelector = locationNavigationState.navigationSelectors.splice(locationCurrentNavigationSelectorIndex, 1)[0];
      locationNavigationState.exhaustedNavigationSelectors.push({ selector: exhaustedSelector.selector, total: exhaustedSelector.explored.length });

      if (!locationNavigationState.navigationSelectors.length) {

         locationNavigationState.exhausted = true;

      } else { locationNavigationState.activeSelectorIndex = _.random(0, locationNavigationState.navigationSelectors.length - 1); }

   }

   private getSelectorState(url: Url) {
      const locationNavigationState = this.getLocationNavigationState(url);
      return locationNavigationState.navigationSelectors[locationNavigationState.activeSelectorIndex];
   }

   public pickRandomAvailableActiveSelectorIndex(url: Url) {
      const selectorState = this.getSelectorState(url);
      const randomAvailableIndex = _.random(0, selectorState.available.length - 1);
      const pickedIndex = selectorState.available.splice(randomAvailableIndex, 1)[0];
      selectorState.explored.push(pickedIndex);
      if (!selectorState.available.length) this.navigationSelectorExhausted(url);
      return pickedIndex;
   }

   public getActiveNavigationSelector(url: Url) {
      const locationNavigationState = this.getLocationNavigationState(url);
      return locationNavigationState.navigationSelectors[locationNavigationState.activeSelectorIndex].selector;
   }

   public getPercentageOfVisitedHandles(url: Url) {

      const locationState = this.getLocationState(url);

      const activeSelectorsProgression = locationState.navigation.navigationSelectors.reduce((total, selectorData) => {
         total.available += selectorData.available.length;
         total.explored += selectorData.explored.length;
         return total;
      }, { available: 0, explored: 0 });

      const exhaustedTotal = locationState.navigation.exhaustedNavigationSelectors.reduce((total, selectorData) => {
         total += selectorData.total;
         return total;
      }, 0);

      const total = activeSelectorsProgression.available + activeSelectorsProgression.explored + exhaustedTotal;
      const exploredTotal = activeSelectorsProgression.explored + exhaustedTotal;

      const percentage = ((exploredTotal * 100) / total).toFixed(1);
      return [percentage, total];

   }

}

export default Locations;