 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "meituan";
 export const LABEL = "美团";
 export const COLOR = "#ffd100";
 
 export function normalize(raw) {
   return buildPayload(raw, SOURCE, (item) => {
     const job = buildJobItem(item, SOURCE);
     job.url = item.source_url || "";
     return job;
   });
 }
 
 export function getOverrides() {
   return new Map();
 }
