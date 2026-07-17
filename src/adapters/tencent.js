 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "tencent";
 export const LABEL = "腾讯";
 export const COLOR = "#1677ff";
 
 export function normalize(raw) {
   return buildPayload(raw, SOURCE, (item) => {
     const job = buildJobItem(item, SOURCE);
     job.display_job_id = item.display_job_id || "";
     return job;
   });
 }
 
 export function getOverrides() {
   return new Map();
 }
