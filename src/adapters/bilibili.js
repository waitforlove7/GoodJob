import { buildJobItem, buildPayload } from "./schema.js";

export const SOURCE = "bilibili";
export const LABEL = "哔哩哔哩";
export const COLOR = "#00aeec";

export function normalize(raw) {
  return buildPayload(raw, SOURCE, (item) => {
    const job = buildJobItem(item, SOURCE);
    job.requirement = item.job_require || "";
    job.url = item.url || "";
    job.display_job_id = "";
    return job;
  });
}

export function getOverrides() {
  return new Map();
}
