import { Url } from "./web";
import { PuppeteerLifeCycleEvent } from "puppeteer";

export interface CrawlerOptions {
   headless?: boolean;
   resultsFolder?: string;
};

export type EndConditionEvaluation = (state: { currentUrl?: Url, results?: Array<LocationExtractionResult>, nextNavigationTarget?: Url }) => boolean;

export interface PageOptions {
   endCondition?: EndConditionEvaluation;
   loading?: PuppeteerLifeCycleEvent;
   discreet?: boolean;
   debug?: boolean;
   defaultTimeout?: number;
   minWait?: number;
   maxWait?: number;
};

export interface BrutePageOptions extends PageOptions {
   setup?: Array<SetupActionDescription>;
};

export type AdvancedSearchOperator = 'inurl' | 'intext' | 'intitle';

export interface LocationExtractionResult {
   url: Url;
   [label: string]: (string | string[]) | { [label: string]: string[] }
};

export interface TargetFilter { exclude?: string[]; include?: string[] }

export interface ExtractionSelectorProperties {
   selector: string;
   parentTextConstraint?: {
      selector: string;
      text: string;
   }
   label?: string;
   relative?: {
      label: string;
      data: string;
   };
   attribute?: string;
   filterFunction?: (data: string) => boolean;
   transformFunction?: (data: string) => string;
}

export interface LocationMap {
   navigation?: {
      targetFilter?: TargetFilter;
      selectors: string[];
   }
   extraction?: Array<ExtractionSelectorProperties>;
   search?: { selector: string[], inputs: (string | string[])[] };
   setup?: Array<SetupActionDescription>;
   exact?: boolean;
   starts?: boolean;
};

export type SetupType = 'click' | 'select' | 'type';

export type SetupWait = number | PuppeteerLifeCycleEvent;

export type SetupActionDescription = {
   type: SetupType;
   selectors: string[];
   option?: string;     // <-- only used with "select" type (option to be picked in a select HTML element)
   wait?: SetupWait;
   onlyOnce?: true | 'done';
};

export interface CrawlMap {
   [urlFragment: string]: LocationMap;
};

export interface LocationSearchState {
   selector: string[];
   inputs: (string | string[])[];
   exhaustedInputs: (string | string[])[];
   exhausted: boolean;
};

export interface LocationNavigationState {
   targetFilter: TargetFilter;
   activeSelectorIndex: number;
   navigationSelectors: Array<{ selector: string, available: number[], explored: number[]; }>;
   exhaustedNavigationSelectors: Array<{ selector: string; total: number }>;
   exhausted: boolean;
};

export interface LocationExtractionState {
   dataSelectors: Array<ExtractionSelectorProperties>;
   dataExtracted: boolean;
};

export interface LocationData {
   navigation?: LocationNavigationState;
   extraction?: LocationExtractionState;
   search?: LocationSearchState;
};