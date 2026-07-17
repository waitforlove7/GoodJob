 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "mihoyo";
 export const LABEL = "米哈游";
 export const COLOR = "#00d4b8";
 
 export function normalize(raw) {
   return buildPayload(raw, SOURCE, (item) => {
     const job = buildJobItem(item, SOURCE);
     // 米哈游 uses "job_require" instead of "requirement"
     job.requirement = item.job_require || "";
     job.url = item.url || "";
     job.display_job_id = "";
     return job;
   });
 }
 
 export function getOverrides() {
   return new Map();
 }
