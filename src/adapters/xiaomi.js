 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "xiaomi";
 export const LABEL = "小米";
 export const COLOR = "#ff6900";
 
 export function normalize(raw) {
   return buildPayload(raw, SOURCE, (item) => {
     const job = buildJobItem(item, SOURCE);
     // Xiaomi data is an array, use source_url as url if url missing
     job.url = item.source_url || "";
     return job;
   });
 }
 
 export function getOverrides() {
   return new Map();
 }
