import fs from 'fs';
import path from 'path';
import { AdvancedSearchOperator } from '../types/crawler';
import _ from 'lodash';

export const quickCopy = (data: any) => JSON.parse(JSON.stringify(data))

export const ensurePathExists = (path: string) => fs.mkdirSync(path, { recursive: true });

export const applyOptions = <OptionsType>(target: OptionsType, options: any): OptionsType => {
   const sealedTarget = Object.seal(target);
   for (const key in target) { sealedTarget[key] = options[key] !== undefined ? options[key] : sealedTarget[key]; }
   return sealedTarget;
};

export const saveData = (folder: string, filename: string, data: any) => {
   ensurePathExists(folder);
   const filenameWithExtension = `${filename}.json`;
   const filepath = path.join(folder, filenameWithExtension);
   fs.writeFileSync(filepath, JSON.stringify(data, null, 3));
   return filepath;
};

export const saveDataCSV = (folder: string, filename: string, data: any) => {
   ensurePathExists(folder);
   const filenameWithExtension = `${filename}.csv`;
   const filePath = path.join(folder, filenameWithExtension);
   fs.writeFileSync(filePath, data);
   return filePath;
};

export const makeAdvancedSearchQueries = (lookups: string[], searchTarget: AdvancedSearchOperator, additions?: { intext?: string[], inurl?: string[], intitle?: string[] }) => {

   if (additions) {

      return lookups.map(lookupEntry => {
         const lookupEntryString = `${searchTarget}:${additions[searchTarget] ? `${additions[searchTarget].join(' ')} +"${lookupEntry}"` : `"${lookupEntry}"`}`;
         const additionsString = `${Object.keys(additions).map((additionType: AdvancedSearchOperator) => additionType !== searchTarget ? `${additionType}:${additions[additionType].join(' ')}` : '').join(' ')}`;
         return (`${lookupEntryString} ${additionsString}`).trim();
      });

   }

   return lookups.map(lookup => `${searchTarget}: "${lookup}"`);

};