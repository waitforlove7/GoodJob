import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildJobGraph } from "../src/jobGraph.js";
import * as bytedance from "../src/adapters/bytedance.js";
import * as tencent from "../src/adapters/tencent.js";
import * as xiaomi from "../src/adapters/xiaomi.js";
import * as jd from "../src/adapters/jd.js";
import * as meituan from "../src/adapters/meituan.js";
import * as mihoyo from "../src/adapters/mihoyo.js";
import * as bilibili from "../src/adapters/bilibili.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "data", "processed");

const sources = {
  bytedance: { file: "bytedance_jobs.json", adapter: bytedance },
  tencent: { file: "tencent_jobs.json", adapter: tencent },
  xiaomi: { file: "xiaomi_tech_jobs.json", adapter: xiaomi },
  jd: { file: "jd_tech_jobs.json", adapter: jd },
  meituan: { file: "meituan_tech_jobs.json", adapter: meituan },
  mihoyo: { file: "mihoyo_tech_jobs.json", adapter: mihoyo },
  bilibili: { file: "bilibili_tech_jobs.json", adapter: bilibili },
};

const knownLocations = [
  "北京", "上海", "深圳", "杭州", "广州", "成都", "武汉", "西安", "南京", "重庆",
  "苏州", "厦门", "珠海", "东莞", "合肥", "天津", "无锡", "长沙", "郑州", "福州",
  "海口", "香港", "澳门", "台北", "新加坡", "东京", "首尔", "曼谷", "雅加达",
];
const locationAlternation = knownLocations.join("|");
const cityOnlyParenthetical = new RegExp(
  `[（(](?:(?:${locationAlternation})(?:[/、,，]|\\s|或)*)+[）)]`,
  "g",
);

function cleanText(value) {
  return String(value || "").replace(/\r\n?/g, "\n").trim();
}

function signatureText(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function normalizeLocation(value) {
  return String(value || "").trim().replace(/市$/, "");
}

function inferLocations(raw, title) {
  const explicit = Array.isArray(raw?.locations)
    ? raw.locations
    : String(raw?.location_text || "").split(/\s*[/、,，]\s*/);
  const inferred = knownLocations.filter((location) => String(title || "").includes(location));
  return [...new Set([...explicit, ...inferred].map(normalizeLocation).filter(Boolean))];
}

function canonicalTitle(title) {
  return signatureText(title)
    .replace(cityOnlyParenthetical, "")
    .replace(/[\s-]+$/, "")
    .trim();
}

function roleSignature(source, item) {
  return crypto.createHash("sha1").update([
    source,
    canonicalTitle(item.title),
    signatureText(item.description),
    signatureText(item.requirement),
  ].join("\0")).digest("hex");
}

function mostFrequent(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

async function buildSource(source, config) {
  const rawPayload = JSON.parse(await fs.readFile(path.join(root, "data", config.file), "utf8"));
  const rawItems = Array.isArray(rawPayload) ? rawPayload : rawPayload.items || [];
  const normalized = config.adapter.normalize(rawPayload);
  const graph = buildJobGraph(normalized, {
    source,
    categoryOverrides: config.adapter.getOverrides(),
  });
  const groups = new Map();

  normalized.items.forEach((item, index) => {
    const signature = roleSignature(source, item);
    if (!groups.has(signature)) {
      groups.set(signature, {
        signature,
        items: [],
        graphJobs: [],
        rawItems: [],
      });
    }
    const group = groups.get(signature);
    group.items.push(item);
    group.graphJobs.push(graph.jobs[index]);
    group.rawItems.push(rawItems[index] || {});
  });

  const roles = [];
  const details = {};
  for (const group of groups.values()) {
    const roleId = group.signature.slice(0, 16);
    const categories = group.graphJobs.map((job) => job.categoryKey);
    const skillIds = new Set(group.graphJobs.flatMap((job) => job.skillIds));
    const skillLabels = [...skillIds]
      .map((skillId) => graph.nodeById.get(skillId)?.label)
      .filter(Boolean)
      .sort();
    const locations = [...new Set(group.items.flatMap((item, index) => (
      inferLocations(group.rawItems[index], item.title)
    )))].sort();
    const representative = group.items[0];
    const title = canonicalTitle(representative.title);

    roles.push({
      source,
      role_id: roleId,
      job_id: roleId,
      title,
      category_key: mostFrequent(categories) || "other",
      skill_labels: skillLabels,
      posting_count: group.items.length,
      locations,
    });

    details[roleId] = {
      description: cleanText(representative.description),
      requirement: cleanText(representative.requirement),
      variants: group.items.map((item, index) => ({
        job_id: String(item.job_id || ""),
        display_job_id: String(item.display_job_id || ""),
        title: cleanText(item.title),
        locations: inferLocations(group.rawItems[index], item.title),
        url: cleanText(item.url),
      })),
    };
  }

  roles.sort((a, b) => a.category_key.localeCompare(b.category_key) || a.title.localeCompare(b.title));
  const totalPostings = normalized.items.length;
  const completePostings = normalized.items.filter((item) => item.description && item.requirement).length;
  const indexPayload = {
    source,
    precomputed: true,
    label: config.adapter.LABEL,
    total_postings: totalPostings,
    complete_postings: completePostings,
    total_roles: roles.length,
    merged_postings: totalPostings - roles.length,
    roles,
  };
  await fs.writeFile(
    path.join(outputDir, `${source}.index.json`),
    `${JSON.stringify(indexPayload)}\n`,
    "utf8",
  );
  const detailShards = new Map();
  for (const [roleId, roleDetails] of Object.entries(details)) {
    const prefix = roleId[0];
    if (!detailShards.has(prefix)) detailShards.set(prefix, {});
    detailShards.get(prefix)[roleId] = roleDetails;
  }
  for (const [prefix, rolesForShard] of detailShards.entries()) {
    await fs.writeFile(
      path.join(outputDir, `${source}.details.${prefix}.json`),
      `${JSON.stringify({ source, prefix, roles: rolesForShard })}\n`,
      "utf8",
    );
  }

  return {
    source,
    postings: totalPostings,
    roles: roles.length,
    merged: totalPostings - roles.length,
    multiPostingRoles: roles.filter((role) => role.posting_count > 1).length,
    multiLocationRoles: roles.filter((role) => role.locations.length > 1).length,
    detailShards: detailShards.size,
    mergedRoles: roles.filter((role) => role.posting_count > 1),
  };
}

await fs.mkdir(outputDir, { recursive: true });
for (const fileName of await fs.readdir(outputDir)) {
  if (/\.(?:index|details(?:\.[0-9a-f])?)\.json$/.test(fileName)) {
    await fs.unlink(path.join(outputDir, fileName));
  }
}
const report = [];
for (const [source, config] of Object.entries(sources)) {
  report.push(await buildSource(source, config));
}
console.table(report.map(({ mergedRoles, ...summary }) => summary));

const markdown = [
  "# 岗位角色合并报告",
  "",
  "合并规则：公司内 `去地点后的标题 + 完整职位描述 + 完整职位要求` 完全一致时，合并为一个岗位角色；所有原始岗位 ID、地点和链接仍保留在详情分片中。",
  "",
];
for (const sourceReport of report) {
  markdown.push(
    `## ${sources[sourceReport.source].adapter.LABEL}`,
    "",
    `- 原始发布：${sourceReport.postings}`,
    `- 岗位角色：${sourceReport.roles}`,
    `- 合并发布：${sourceReport.merged}`,
    `- 发生合并的角色组：${sourceReport.multiPostingRoles}`,
    "",
  );
  if (sourceReport.mergedRoles.length === 0) {
    markdown.push("没有符合保守合并规则的重复发布。", "");
    continue;
  }
  markdown.push("| 岗位角色 | 发布数 | 地点 | 角色 ID |", "|---|---:|---|---|");
  for (const role of sourceReport.mergedRoles.sort((a, b) => b.posting_count - a.posting_count || a.title.localeCompare(b.title))) {
    markdown.push(`| ${role.title.replace(/\|/g, "\\|")} | ${role.posting_count} | ${role.locations.join(" / ") || "未标注"} | ${role.role_id} |`);
  }
  markdown.push("");
}
await fs.writeFile(path.join(root, "docs", "role_merge_report.md"), `${markdown.join("\n")}\n`, "utf8");
