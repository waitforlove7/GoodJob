 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "jd";
 export const LABEL = "京东";
 export const COLOR = "#e2231a";
 
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
