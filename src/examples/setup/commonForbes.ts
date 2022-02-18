import { SetupActionDescription } from "../../types/crawler";

export const commonForbes: SetupActionDescription[] = [{
   onlyOnce: true,
   type: 'click',
   selectors: ['#truste-consent-button'],
   wait: 'networkidle2'
}, {
   type: 'select',
   option: 'United States',
   selectors: ['#fbs-table-dropdown'],
   wait: 5000
}]