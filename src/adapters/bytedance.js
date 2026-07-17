 import { buildJobItem, buildPayload } from "./schema.js";
 
 export const SOURCE = "bytedance";
 export const LABEL = "字节跳动";
 export const COLOR = "#1c7ed6";
 
 const CATEGORY_OVERRIDES = new Map([
   ["7592888600183163141", "systems"],
   ["7582540133448173829", "systems"],
   ["7545071295689263367", "systems"],
   ["7535723120025454855", "systems"],
   ["7506356839475808519", "systems"],
   ["7483354724784670994", "systems"],
   ["7103498806301509919", "systems"],
   ["7654903858576034053", "systems"],
   ["7431586759971146023", "systems"],
   ["7496016995936373000", "systems"],
   ["7630814091124328757", "systems"],
   ["7629638570849323317", "systems"],
   ["7623376910307641605", "systems"],
   ["7366450100144523570", "systems"],
   ["7542438897859938568", "systems"],
   ["7647381821422029061", "systems"],
   ["7599960070339987765", "systems"],
   ["7649232613291247925", "systems"],
   ["7649232361355839797", "systems"],
   ["7649230345385691397", "systems"],
   ["7649230264456366389", "systems"],
   ["7649228574625417525", "systems"],
   ["7649227839954864437", "systems"],
   ["7647747126361131317", "systems"],
   ["7628882548761610501", "systems"],
   ["7622955042161248565", "systems"],
   ["7622954227891865909", "systems"],
   ["7622953785719802165", "systems"],
   ["7622952931436841269", "systems"],
   ["7261946883973974332", "systems"],
   ["6792568569717590286", "systems"],
   ["7582165993067874565", "testing"],
   ["7582165993066662149", "testing"],
   ["7582165348822550837", "testing"],
   ["7582165348083763509", "testing"],
 ]);
 
 export function normalize(raw) {
   return buildPayload(raw, SOURCE, (item) => {
     const job = buildJobItem(item, SOURCE);
     job.display_job_id = item.display_job_id || "";
     return job;
   });
 }
 
 export function getOverrides() {
   return CATEGORY_OVERRIDES;
 }
