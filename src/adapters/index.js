 import { buildPayload, buildJobItem as sharedBuildJobItem } from "./schema.js";
 
 import * as bytedance from "./bytedance.js";
 import * as tencent from "./tencent.js";
 import * as xiaomi from "./xiaomi.js";
 import * as jd from "./jd.js";
 import * as meituan from "./meituan.js";
import * as mihoyo from "./mihoyo.js";
import * as bilibili from "./bilibili.js";
 
 /**
  * Company registry — add new companies here.
  * Each entry:
  *   importFile:  dynamic import path for the JSON file (relative to project root)
  *   normalize:   function(rawPayload) => { source, total, items, source_url }
  *   getOverrides: function() => Map<job_id, category_key>
  *   label, color: for the UI selector
  *   source:      stable key used in node IDs
  */
 export const COMPANY_CONFIGS = {
  bytedance: {
    ...bytedance,
    indexFile: () => import("../../data/processed/bytedance.index.json"),
  },
  tencent: {
    ...tencent,
    indexFile: () => import("../../data/processed/tencent.index.json"),
  },
  xiaomi: {
    ...xiaomi,
    indexFile: () => import("../../data/processed/xiaomi.index.json"),
  },
  jd: {
    ...jd,
    indexFile: () => import("../../data/processed/jd.index.json"),
  },
  meituan: {
    ...meituan,
    indexFile: () => import("../../data/processed/meituan.index.json"),
  },
  mihoyo: {
    ...mihoyo,
    indexFile: () => import("../../data/processed/mihoyo.index.json"),
  },
  bilibili: {
    ...bilibili,
    indexFile: () => import("../../data/processed/bilibili.index.json"),
  },
};
 
 export const COMPANY_KEYS = Object.keys(COMPANY_CONFIGS);
 
 /**
  * Build the combined override map keyed by "source:job_id".
  */
 export function buildMergedOverrides(companyKeys) {
   const merged = new Map();
   for (const key of companyKeys) {
     const config = COMPANY_CONFIGS[key];
     for (const [jobId, category] of config.getOverrides()) {
       merged.set(`${config.SOURCE}:${jobId}`, category);
     }
   }
   return merged;
 }
 
 /**
  * Load data for a single company and normalize it.
  */
export async function loadCompanyData(companyKey) {
  const config = COMPANY_CONFIGS[companyKey];
  if (!config) throw new Error(`Unknown company: ${companyKey}`);
  const imported = await config.indexFile();
  const index = imported.default || imported;
  return {
    source: companyKey,
    precomputed: true,
    total_postings: index.total_postings,
    complete_postings: index.complete_postings,
    total_roles: index.total_roles,
    items: index.roles.map((role) => ({ ...role, source_label: config.LABEL })),
  };
}
 
 /**
  * Load data for multiple companies and merge into one payload.
  */
 export async function loadMergedData(companyKeys) {
   const results = await Promise.all(companyKeys.map(loadCompanyData));
  const combined = {
    source: "all",
    precomputed: true,
    total_postings: 0,
    complete_postings: 0,
    total_roles: 0,
    items: [],
  };
  for (const result of results) {
    combined.total_postings += result.total_postings;
    combined.complete_postings += result.complete_postings;
    combined.total_roles += result.total_roles;
    combined.items.push(...result.items);
  }
  return combined;
}

const detailModules = import.meta.glob("../../data/processed/*.details.*.json", { import: "default" });
const detailsCache = new Map();

export async function loadRoleDetails(companyKey, roleId) {
  const config = COMPANY_CONFIGS[companyKey];
  if (!config) throw new Error(`Unknown company: ${companyKey}`);
  const prefix = String(roleId || "")[0];
  const modulePath = `../../data/processed/${companyKey}.details.${prefix}.json`;
  const loadDetails = detailModules[modulePath];
  if (!loadDetails) throw new Error(`Missing detail shard: ${companyKey}/${prefix}`);
  if (!detailsCache.has(modulePath)) {
    detailsCache.set(modulePath, loadDetails());
  }
  const payload = await detailsCache.get(modulePath);
  return payload.roles?.[roleId] || null;
}
