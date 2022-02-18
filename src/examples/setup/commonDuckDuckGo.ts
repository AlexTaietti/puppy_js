import { SetupActionDescription } from "../../types/crawler";

export const commonDuckduckgo: SetupActionDescription = {
   onlyOnce: true,
   selectors: ['.dropdown__switch'],
   type: 'click'
};