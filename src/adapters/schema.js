 /**
  * Normalize a single job item to the internal schema.
  * Each vendor adapter calls this with its own field mapping.
  */
 export function buildJobItem(raw, source) {
   return {
     source,
     title: raw.title || raw.name || "",
     description: raw.description || "",
     requirement: raw.requirement || raw.job_require || raw.requirements || "",
     url: raw.url || raw.source_url || "",
     job_id: String(raw.job_id ?? raw.postId ?? raw.id ?? ""),
     display_job_id: String(raw.display_job_id ?? raw.position_code ?? raw.postId ?? ""),
   };
 }
 
 /**
  * Build a payload object that buildJobGraph can consume.
  * Array-type sources get wrapped into { items, total, source_url }.
  */
 export function buildPayload(rawPayload, source, normalizeItem) {
   const items = Array.isArray(rawPayload)
     ? rawPayload
     : rawPayload.items || [];
   return {
     source,
     total: rawPayload.total ?? items.length,
     source_url: rawPayload.source_url || "",
     items: items.map((item) => normalizeItem(item, source)),
   };
 }
