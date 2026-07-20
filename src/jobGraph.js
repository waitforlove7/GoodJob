// ═══════════════ 简历解析后自动匹配岗位 — 改进版 ═══════════════
// 新增：加权评分匹配、IDF 权重、中文模糊匹配、外部化技能规则
import SKILL_RULES from "./data/skill_rules.json" with { type: "json" };

export const CATEGORY_RULES = [
  {
    id: "frontend",
    label: "前端",
    color: "#39c5bb",
    title: ["前端", "web", "Web", "React", "Vue"],
    body: ["JavaScript", "TypeScript", "React", "Vue", "Node.js", "HTML", "CSS"],
  },
  {
    id: "backend",
    label: "后端",
    color: "#5b8cff",
    title: ["后端", "服务端", "后台", "Server", "Golang", "Go", "Java"],
    body: ["服务端", "分布式", "RPC", "微服务", "高并发", "Golang", "Java", "C++"],
  },
  {
    id: "ops",
    label: "运维",
    color: "#8ed36f",
    title: ["运维", "SRE", "DevOps", "稳定性", "交付"],
    body: ["K8s", "Kubernetes", "Docker", "自动化部署", "稳定性治理", "监控", "告警"],
  },
  {
    id: "ai_agent",
    label: "AI&Agent",
    color: "#ff6fd8",
    title: ["AI Agent方向", "AI Agent", "大模型", "AIGC", "LLM", "Agent", "智能体", "RAG", "Prompt", "Fine-Tuning", "LangGraph", "CrewAI", "OpenClaw", "AI应用"],
    body: [
      "大模型",
      "大语言模型",
      "AIGC",
      "LLM",
      "Agent",
      "智能体",
      "RAG",
      "Prompt Engineering",
      "Prompt engineering",
      "Fine-Tuning",
      "fine-tuning",
      "LangGraph",
      "Lang Graph",
      "CrewAI",
      "OpenClaw",
    ],
  },
  {
    id: "algorithm",
    label: "算法",
    color: "#d96cff",
    title: ["风控算法工程师", "检测算法", "反作弊算法", "高级算法工程师", "算法", "机器学习", "推荐", "搜索", "NLP", "CV"],
    body: ["机器学习", "深度学习", "推荐算法", "Transformer", "PyTorch", "TensorFlow"],
  },
  {
    id: "testing",
    label: "测试",
    color: "#ff7474",
    title: ["测试开发工程师", "测试开发", "测试", "质量", "QA"],
    body: ["测试开发", "自动化测试", "质量保障", "测试用例", "缺陷", "灰度"],
  },
  {
    id: "security",
    label: "安全",
    color: "#ff9861",
    title: ["安全", "风控", "反作弊", "隐私", "合规"],
    body: ["安全", "风控", "反欺诈", "反作弊", "权限", "漏洞", "隐私"],
  },
  {
    id: "data",
    label: "数据",
    color: "#4dd6ff",
    title: ["数据", "大数据", "数仓", "BI", "Data", "数据库", "DBA", "MySQL", "Redis", "HBase", "ClickHouse", "ByteTable"],
    body: ["Spark", "Flink", "Hadoop", "Hive", "数据湖", "数据仓库", "数据分析", "ETL", "数据库", "MySQL", "Redis", "HBase", "ClickHouse", "Doris", "OLAP", "SQL"],
  },
  {
    id: "client",
    label: "客户端",
    color: "#7bdf9b",
    title: ["客户端", "Android", "iOS", "Flutter", "移动端", "跨端", "Camera", "游戏研发", "游戏开发", "游戏客户端", "XR"],
    body: ["Android", "iOS", "Flutter", "移动端", "跨平台", "端侧", "相机", "游戏研发", "游戏开发", "游戏客户端", "XR"],
  },
  {
    id: "hardware",
    label: "硬件",
    color: "#c7ccd6",
    title: ["芯片", "SoC", "NPU", "GPU", "硬件", "PCIe", "DMA", "驱动"],
    body: ["芯片", "SoC", "NPU", "GPU", "硬件", "PCIe", "DMA", "驱动", "Sensor", "传感器"],
  },
  {
    id: "systems",
    label: "系统/网络",
    color: "#9fb7d8",
    title: ["Linux", "内核", "系统内核", "系统软件", "弹性计算系统", "高性能计算平台", "AI存储", "RISC-V", "编译器", "AI基础设施", "高性能网络", "数据中心网络", "网络研发", "网络", "AI性能优化", "训练性能优化"],
    body: ["Linux内核", "系统内核", "系统软件", "弹性计算系统", "高性能计算平台", "AI存储", "RISC-V", "编译器", "AI基础设施", "高性能网络", "数据中心网络", "网络协议", "网络研发", "高性能通信", "AI性能优化", "训练性能优化"],
  },
  {
    id: "product",
    label: "产品/项目",
    color: "#ffe066",
    title: ["产品", "项目", "PM", "解决方案", "交付"],
    body: ["产品设计", "项目管理", "需求分析", "客户", "解决方案"],
  },
];
export const OTHER_CATEGORY = {
  id: "other",
  label: "其他",
  color: "#9aa4b2",
  title: [],
  body: [],
};

const JOB_CATEGORY_OVERRIDES = new Map([
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

const allCategories = [...CATEGORY_RULES, OTHER_CATEGORY];
const SKILL_LEVEL_COLORS = ["#6ee7a8", "#d6e85f", "#ffb347", "#ff5f57"];
const SKILL_COMBINATION_EXCLUSIVE_GROUPS = [
  new Set(["Python", "Java", "Go", "C/C++", "JS/TS", "Rust", "Swift"]),
  new Set(["React", "Vue", "Svelte"]),
  new Set(["PyTorch", "TensorFlow"]),
];

export function buildJobGraph(payload, { source = "unknown", categoryOverrides = JOB_CATEGORY_OVERRIDES } = {}) {
  const sourceItems = Array.isArray(payload) ? payload : payload?.items || [];
  const categories = allCategories.map((rule, index) => ({
    id: `category:${rule.id}`,
    key: rule.id,
    type: "category",
    label: rule.label,
    color: rule.color,
    layer: 1,
    index,
  }));

  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const skillMap = new Map();
  const jobs = [];
  const links = [];
  const jobsByCategory = new Map(categories.map((category) => [category.id, []]));
  const jobsBySkill = new Map();
  const jobsBySkillAndCategory = new Map();
  const skillCountByCategory = new Map(categories.map((category) => [category.id, new Map()]));
  const globalSkillCount = new Map();

  for (const [index, item] of sourceItems.entries()) {
    const title = cleanText(item?.title);
    const displayTitle = payload?.precomputed
      ? title
      : cleanText(item?.display_title) || cleanJobTitle(title);
    const description = cleanText(item?.description);
    const requirement = cleanText(item?.requirement);
    const text = `${title}\n${description}\n${requirement}`;
    const categoryKey = item?.category_key
      || categoryOverrides.get(`${item?.source || source}:${item?.job_id || ""}`)
      || categoryOverrides.get(String(item?.job_id || ""))
      || classifyJob(title, `${description}\n${requirement}`);
    const category = categoryByKey.get(categoryKey) || categoryByKey.get("other");
    const skillLabels = new Set(
      Array.isArray(item?.skill_labels) ? item.skill_labels : extractSkills(text),
    );
    if (category.key === "frontend") {
      skillLabels.add("JS/TS");
    }
    const jobSource = item?.source || source;
    const rawJobId = item?.role_id || item?.job_id || index;
    const jobId = `job:${jobSource}:${rawJobId}`;

    const job = {
      id: jobId,
      type: "job",
      label: displayTitle || title || `未命名岗位 ${index + 1}`,
      rawTitle: title,
      source: jobSource,
      sourceLabel: item?.source_label || jobSource,
      jobId: rawJobId,
      roleId: item?.role_id || rawJobId,
      displayJobId: item?.display_job_id || "",
      url: item?.url || "",
      description,
      requirement,
      postingCount: Number(item?.posting_count) || 1,
      locations: Array.isArray(item?.locations) ? item.locations : [],
      categoryId: category.id,
      categoryKey: category.key,
      skillIds: [],
      layer: 0,
      index,
    };

    jobs.push(job);
    jobsByCategory.get(category.id).push(job);
    links.push({ id: `${category.id}->${job.id}`, source: category.id, target: job.id, type: "category-job" });

    for (const label of skillLabels) {
      const id = `skill:${slugify(label)}`;
      if (!skillMap.has(id)) {
        skillMap.set(id, {
          id,
          type: "skill",
          label,
          color: "#f8f4df",
          count: 0,
          layer: -1,
          index: skillMap.size,
        });
      }

      const skill = skillMap.get(id);
      skill.count += 1;
      job.skillIds.push(id);
      if (!jobsBySkill.has(id)) jobsBySkill.set(id, []);
      jobsBySkill.get(id).push(job);
      if (!jobsBySkillAndCategory.has(id)) jobsBySkillAndCategory.set(id, new Map());
      const skillCategoryMap = jobsBySkillAndCategory.get(id);
      if (!skillCategoryMap.has(category.id)) skillCategoryMap.set(category.id, []);
      skillCategoryMap.get(category.id).push(job);
      links.push({ id: `${job.id}->${id}`, source: job.id, target: id, type: "job-skill" });
      increment(globalSkillCount, id);
      increment(skillCountByCategory.get(category.id), id);
    }
  }

  const skills = [...skillMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  skills.forEach((skill, index) => {
    skill.index = index;
  });

  for (const category of categories) {
    const counts = skillCountByCategory.get(category.id);
    for (const [skillId, count] of counts.entries()) {
      links.push({
        id: `${category.id}->${skillId}`,
        source: category.id,
        target: skillId,
        type: "category-skill",
        count,
      });
    }
  }

  const nodes = [...categories, ...jobs, ...skills];
  assignPositions(categories, jobs, skills, jobsByCategory);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const globalSkillRanking = rankingFromCounts(globalSkillCount, nodeById);
  const skillRankingByCategory = new Map(
    categories.map((category) => [category.id, rankingFromCounts(skillCountByCategory.get(category.id), nodeById)]),
  );
  const skillTripleRankingByCategory = new Map(
    categories.map((category) => [category.id, rankSkillTriples(jobsByCategory.get(category.id), nodeById)]),
  );
  const globalSkillVisuals = buildSkillVisualMap(skills, globalSkillCount);
  const skillVisualsByCategory = new Map(
    categories.map((category) => [category.id, buildSkillVisualMap(skills, skillCountByCategory.get(category.id))]),
  );

  return {
    categories,
    jobs,
    skills,
    nodes,
    links,
    nodeById,
    jobsByCategory,
    jobsBySkill,
    jobsBySkillAndCategory,
    globalSkillRanking,
    skillRankingByCategory,
    skillTripleRankingByCategory,
    globalSkillVisuals,
    skillVisualsByCategory,
    stats: {
      totalJobs: payload?.total_postings ?? jobs.length,
      roleCount: jobs.length,
      completeJobs: payload?.complete_postings
        ?? sourceItems.filter((item) => cleanText(item?.description) && cleanText(item?.requirement)).length,
      completeRate: (payload?.total_postings ?? jobs.length)
        ? Math.round(((payload?.complete_postings
          ?? sourceItems.filter((item) => cleanText(item?.description) && cleanText(item?.requirement)).length)
          / (payload?.total_postings ?? jobs.length)) * 100)
        : 0,
      sourceUrl: payload?.source_url || "",
    },
  };
}

export function graphForSelection(
  graph,
  selected,
  { selectedSkillIds = [], skillCategoryFilterId = null } = {},
) {
  const selectedNode = selected ? graph.nodeById.get(selected.id) : null;
  if (selectedNode?.type === "skill") {
    const activeSkillIds = selectedSkillIds.length > 0 ? selectedSkillIds : [selectedNode.id];
    const matchingJobs = jobsMatchingAllSkills(graph, activeSkillIds).filter((job) => (
      !skillCategoryFilterId || job.categoryId === skillCategoryFilterId
    ));
    const matchingJobIds = new Set(matchingJobs.map((job) => job.id));
    const matchingCategoryIds = new Set(matchingJobs.map((job) => job.categoryId));
    const activeSkillIdSet = new Set(activeSkillIds);
    const visibleNodeIds = new Set([
      ...graph.categories.map((category) => category.id),
      ...graph.skills.map((skill) => skill.id),
      ...matchingJobIds,
    ]);
    return {
      ...graph,
      nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
      links: graph.links.filter((link) => (
        (link.type === "category-job" && matchingJobIds.has(link.target))
        || (link.type === "job-skill" && matchingJobIds.has(link.source) && activeSkillIdSet.has(link.target))
        || (link.type === "category-skill" && matchingCategoryIds.has(link.source) && activeSkillIdSet.has(link.target))
      )),
    };
  }
  const categoryId = selectedNode?.type === "category"
    ? selectedNode.id
    : selectedNode?.type === "job"
      ? selectedNode.categoryId
      : null;
  const categoryJobs = categoryId ? graph.jobsByCategory.get(categoryId) || [] : [];
  const visibleNodeIds = new Set([
    ...graph.categories.map((category) => category.id),
    ...graph.skills.map((skill) => skill.id),
    ...categoryJobs.map((job) => job.id),
  ]);
  const links = categoryId
    ? graph.links.filter((link) => (
        (link.type === "category-job" && link.source === categoryId)
        || (link.type === "job-skill" && visibleNodeIds.has(link.source))
        || (link.type === "category-skill" && link.source === categoryId)
      ))
    : graph.links.filter((link) => link.type === "category-skill");
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    links,
  };
}

export function searchJobs(graph, query, limit = 10) {
  const normalizedQuery = cleanText(query).normalize("NFKC").toLocaleLowerCase();
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return graph.jobs
    .map((job) => {
      const category = graph.nodeById.get(job.categoryId);
      const skillLabels = job.skillIds
        .map((skillId) => graph.nodeById.get(skillId)?.label || "")
        .filter(Boolean);
      const title = job.label.normalize("NFKC").toLocaleLowerCase();
      const skillText = skillLabels.join(" ").normalize("NFKC").toLocaleLowerCase();
      const context = [
        title,
        category?.label || "",
        category?.key || "",
        skillText,
        job.sourceLabel || job.source,
        job.source,
        ...job.locations,
      ].join(" ").normalize("NFKC").toLocaleLowerCase();
      if (!tokens.every((token) => context.includes(token))) return null;

      const score = title === normalizedQuery
        ? 0
        : title.startsWith(normalizedQuery)
          ? 1
          : title.includes(normalizedQuery)
            ? 2
            : skillText.includes(normalizedQuery)
              ? 3
              : 4;
      return { job, score };
    })
    .filter(Boolean)
    .sort((a, b) => (
      a.score - b.score
      || b.job.postingCount - a.job.postingCount
      || a.job.label.localeCompare(b.job.label)
    ))
    .slice(0, limit)
    .map(({ job }) => job);
}

export function classifyJob(title, body) {
  if (isOtherDomainJob(title)) {
    return OTHER_CATEGORY.id;
  }

  let winner = OTHER_CATEGORY.id;
  let bestScore = 0;

  for (let index = 0; index < CATEGORY_RULES.length; index += 1) {
    const rule = CATEGORY_RULES[index];
    const titleHits = countHits(title, rule.title);
    const bodyHits = countHits(body, rule.body);
    const score = titleHits * 4 + bodyHits;
    if (score > bestScore) {
      bestScore = score;
      winner = rule.id;
    }
  }

  return winner;
}

export function cleanJobTitle(title) {
  const normalized = cleanText(title);
  const separatorIndex = findDepartmentSeparator(normalized);
  if (separatorIndex < 0) return normalized.replaceAll("豆包", "").trim();

  const suffix = normalized.slice(separatorIndex).replace(/^\s*[-－﹣—‒]\s*/, "").trim();
  if (!looksLikeDepartmentSuffix(suffix)) return normalized.replaceAll("豆包", "").trim();
  return normalized.slice(0, separatorIndex).replaceAll("豆包", "").trim();
}

function findDepartmentSeparator(title) {
  const separators = title.matchAll(/[-－﹣—‒]/g);
  for (const match of separators) {
    const index = match.index;
    const before = title[index - 1] || "";
    const after = title[index + 1] || "";
    if (/[A-Za-z]/.test(before) && /[A-Za-z]/.test(after)) continue;
    return title.slice(0, index).trimEnd().length;
  }
  return -1;
}

function looksLikeDepartmentSuffix(suffix) {
  if (!suffix) return false;
  if (/[\u4e00-\u9fff]/.test(suffix)) return true;
  return /^(Data|TikTok|CapCut|Lark|PICO|Seed|Flow|Live|Ecommerce|Ads|Global|TRAE)$/i.test(suffix);
}

function isOtherDomainJob(title) {
  return ["CADD", "AI制药", "AI 制药"].some((term) => aliasMatches(title, term));
}

export function extractSkills(text) {
  const found = new Set();
  for (const [label, aliases] of SKILL_RULES) {
    if (aliases.some((alias) => aliasMatches(text, alias))) {
      found.add(label);
    }
  }
  return [...found];
}

export function jobsMatchingAllSkills(graph, skillIds) {
  if (!skillIds.length) return [];
  const [firstSkillId, ...remainingSkillIds] = skillIds;
  return (graph.jobsBySkill.get(firstSkillId) || []).filter((job) =>
    remainingSkillIds.every((skillId) => job.skillIds.includes(skillId)),
  );
}

// ═══════════════ 新增：加权评分匹配 ═══════════════

/**
 * 加权评分匹配 — 不要求岗位包含所有技能，按综合分排序。
 * recall   = 命中技能数 / 简历技能总数（简历侧覆盖）
 * coverage = 命中技能数 / 岗位技能总数（岗位侧精准度）
 * score    = recall*0.60 + coverage*0.25 + log1p(招聘数)*0.02
 * 默认阈值 0.20 过滤掉几乎不相关的岗位。
 */
export function scoreJobsBySkills(graph, skillIds, threshold = 0.20) {
  if (!skillIds.length) return [];
  const skillSet = new Set(skillIds);
  const matches = [];

  for (const job of graph.jobs) {
    const matchedCount = job.skillIds.filter((sid) => skillSet.has(sid)).length;
    if (matchedCount === 0) continue;
    const recall = matchedCount / skillIds.length;
    const coverage = job.skillIds.length > 0 ? matchedCount / job.skillIds.length : 0;
    const score = recall * 0.60 + coverage * 0.25 + Math.log1p(job.postingCount) * 0.02;
    if (score >= threshold) {
      matches.push({ job, score, matchedCount, totalResumeSkills: skillIds.length, jobSkillCount: job.skillIds.length });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

// ═══════════════ 新增：IDF 加权评分匹配 ═══════════════

/**
 * IDF 加权评分 — 稀有技能命中权重更高，常见技能（如 Python）权重更低。
 * 原理：技能越常见，idf 越低，避免"Python"主宰所有匹配结果。
 */
export function scoreJobsBySkillsWeighted(graph, skillIds, threshold = 0.20) {
  if (!skillIds.length) return [];
  const totalJobs = graph.jobs.length || 1;
  const globalCounts = new Map(graph.globalSkillRanking.map((r) => [r.id, r.count]));

  // 计算每个技能的 IDF 权重
  const skillWeights = new Map();
  for (const sid of skillIds) {
    const globalCount = globalCounts.get(sid) || 1;
    const idf = Math.log((totalJobs + 1) / (globalCount + 1)) + 0.5;
    skillWeights.set(sid, Math.max(0.3, Math.min(idf, 2.5)));
  }

  const matches = [];
  for (const job of graph.jobs) {
    let weightedMatch = 0;
    let totalWeight = 0;
    for (const sid of skillIds) {
      const w = skillWeights.get(sid) || 0.3;
      totalWeight += w;
      if (job.skillIds.includes(sid)) weightedMatch += w;
    }
    if (weightedMatch === 0) continue;
    const score = weightedMatch / totalWeight;
    if (score >= threshold) {
      matches.push({ job, score, weightedMatch, totalWeight });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * 按类别限定的匹配 — 只在指定的岗位类别中搜索，适合"简历技术栈→目标类别岗位"场景。
 */
export function scoreJobsByCategory(graph, skillIds, categoryKey, threshold = 0.20) {
  const category = graph.categories.find((c) => c.key === categoryKey);
  if (!category) return [];
  const categoryJobs = graph.jobsByCategory.get(category.id) || [];
  const skillSet = new Set(skillIds);
  const matches = [];

  for (const job of categoryJobs) {
    const matchedCount = job.skillIds.filter((sid) => skillSet.has(sid)).length;
    if (matchedCount === 0) continue;
    const recall = matchedCount / skillIds.length;
    const coverage = job.skillIds.length > 0 ? matchedCount / job.skillIds.length : 0;
    const score = recall * 0.60 + coverage * 0.25 + Math.log1p(job.postingCount) * 0.02;
    if (score >= threshold) {
      matches.push({ job, score, matchedCount, totalResumeSkills: skillIds.length });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function sortRelatedJobs(jobs, categoryKey) {
  if (categoryKey !== "frontend") return jobs;
  const isFullStack = (job) => /全栈|full[-_\s]*stack/i.test(job.label || job.rawTitle || "");
  return [...jobs].sort((a, b) => Number(isFullStack(b)) - Number(isFullStack(a)));
}

export function rankSkillTriples(jobs, nodeById) {
  const counts = new Map();

  for (const job of jobs) {
    const skills = [...new Set(job.skillIds)]
      .map((skillId) => nodeById.get(skillId))
      .filter(Boolean);

    for (let first = 0; first < skills.length - 2; first += 1) {
      for (let second = first + 1; second < skills.length - 1; second += 1) {
        for (let third = second + 1; third < skills.length; third += 1) {
          const combination = [skills[first], skills[second], skills[third]].sort((a, b) =>
            a.label.localeCompare(b.label, "zh-CN"),
          );
          const labels = combination.map((skill) => skill.label);
          const hasExclusiveOverlap = SKILL_COMBINATION_EXCLUSIVE_GROUPS.some(
            (group) => labels.filter((label) => group.has(label)).length > 1,
          );
          if (hasExclusiveOverlap) continue;

          const id = combination.map((skill) => skill.id).join("|");
          const current = counts.get(id);
          counts.set(id, current ? { ...current, count: current.count + 1 } : { id, skills: combination, count: 1 });
        }
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .map((combination) => ({
      ...combination,
      share: jobs.length ? combination.count / jobs.length : 0,
    }));
}

function assignPositions(categories, jobs, skills, jobsByCategory) {
  const categoryRadius = 34;
  const jobRadiusBase = 13;
  const skillRadius = Math.max(34, Math.sqrt(skills.length) * 3.4);
  const categoryCounts = categories.map((category) => jobsByCategory.get(category.id)?.length || 0);
  const maxCategoryCount = Math.max(...categoryCounts, 1);
  const maxJobSkillCount = Math.max(...jobs.map((job) => job.skillIds.length), 0);
  const maxSkillCount = Math.max(...skills.map((skill) => skill.count), 1);

  const categoriesBySize = [...categories].sort((a, b) => {
    const countDiff = (jobsByCategory.get(b.id)?.length || 0) - (jobsByCategory.get(a.id)?.length || 0);
    return countDiff || a.label.localeCompare(b.label);
  });

  categoriesBySize.forEach((category, index) => {
    const jobCount = jobsByCategory.get(category.id)?.length || 0;
    const angle = (index / categoriesBySize.length) * Math.PI * 2 - Math.PI / 2;
    category.x = Math.cos(angle) * categoryRadius;
    category.y = 26;
    category.z = Math.sin(angle) * categoryRadius;
    category.radius = Math.max(0.82, Math.cbrt(Math.max(jobCount, 1) / maxCategoryCount) * 3.08);
  });

  for (const category of categories) {
    const categoryJobs = jobsByCategory.get(category.id) || [];
    const columns = Math.max(4, Math.ceil(Math.sqrt(categoryJobs.length)));
    const spread = Math.max(jobRadiusBase, Math.sqrt(categoryJobs.length) * 2.1);
    categoryJobs.forEach((job, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const localX = (col - (columns - 1) / 2) * (spread / columns);
      const localZ = (row - Math.ceil(categoryJobs.length / columns) / 2) * (spread / columns);
      job.x = category.x * 0.45 + localX;
      job.y = 0 + ((index % 5) - 2) * 0.7;
      job.z = category.z * 0.45 + localZ;
      job.color = heatColor(job.skillIds.length, maxJobSkillCount);
      job.radius = 0.82;
    });
  }

  skills.forEach((skill, index) => {
    const angle = (index / Math.max(skills.length, 1)) * Math.PI * 2;
    const ring = 0.35 + (index % 5) * 0.16;
    const visual = skillVisual(skill.count, maxSkillCount);
    skill.x = Math.cos(angle) * skillRadius * ring;
    skill.y = -26 - (index % 4) * 0.8;
    skill.z = Math.sin(angle) * skillRadius * ring;
    skill.level = visual.level;
    skill.color = visual.color;
    skill.radius = visual.radius;
  });

  repelLayer(jobs, 1.45, 36);
  repelLayer(skills, 1.05, 32);
}

function skillLevel(count, maxCount) {
  if (maxCount <= 1) return 0;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.45) return 2;
  if (ratio >= 0.18) return 1;
  return 0;
}

function skillVisual(count, maxCount) {
  const level = skillLevel(count, maxCount);
  return {
    count,
    level: level + 1,
    color: SKILL_LEVEL_COLORS[level],
    radius: 0.42 + Math.sqrt(count / maxCount) * 1.05,
  };
}

function heatColor(count, maxCount) {
  const ratio = maxCount > 0 ? Math.min(Math.max(count / maxCount, 0), 1) : 0;
  const position = ratio * (SKILL_LEVEL_COLORS.length - 1);
  const startIndex = Math.floor(position);
  const endIndex = Math.min(startIndex + 1, SKILL_LEVEL_COLORS.length - 1);
  return interpolateHexColor(SKILL_LEVEL_COLORS[startIndex], SKILL_LEVEL_COLORS[endIndex], position - startIndex);
}

function interpolateHexColor(start, end, amount) {
  const startValue = Number.parseInt(start.slice(1), 16);
  const endValue = Number.parseInt(end.slice(1), 16);
  const channels = [16, 8, 0].map((shift) => {
    const startChannel = (startValue >> shift) & 0xff;
    const endChannel = (endValue >> shift) & 0xff;
    return Math.round(startChannel + (endChannel - startChannel) * amount);
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function buildSkillVisualMap(skills, counts) {
  const maxCount = Math.max(...counts.values(), 1);
  return new Map(
    skills.map((skill) => {
      const count = counts.get(skill.id) || 0;
      return [skill.id, skillVisual(count, maxCount)];
    }),
  );
}

function repelLayer(nodes, minDistance, rounds) {
  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distance = Math.sqrt(dx * dx + dz * dz) || 0.001;
        if (distance < minDistance) {
          const push = (minDistance - distance) * 0.08;
          const nx = dx / distance;
          const nz = dz / distance;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
        }
      }
    }
  }
}

function rankingFromCounts(counts, nodeById) {
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: nodeById.get(id)?.label || id, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countHits(text, terms) {
  return terms.reduce((total, term) => total + (aliasMatches(text, term) ? 1 : 0), 0);
}

// ═══════════════ 增强：中文模糊匹配 ═══════════════

/**
 * 中文文本规范化 — 去除标点、空白、常见干扰后缀（如"系统""平台""框架"），
 * 让"分布式"可以匹配到"分布式系统"，"监控"匹配到"监控体系"。
 */
function normalizeChinese(text) {
  return text
    .replace(/[，,。！？、；：""''《》【】（）()\s]+/g, "")
    .replace(/(系统|平台|框架|体系|引擎|工具|服务|端|方向)(?=[\u4e00-\u9fff]|$)/g, "")
    .toLowerCase();
}

function aliasMatches(text, aliasConfig) {
  const alias = typeof aliasConfig === "string" ? aliasConfig : aliasConfig.term;
  const flags = typeof aliasConfig === "string" || !aliasConfig.caseSensitive ? "i" : "";
  if (!text || !alias) return false;

  // ── 纯 ASCII 关键词走单词边界 regex ──
  if (/^[A-Za-z0-9.+#-]+$/.test(alias)) {
    const escaped = escapeRegExp(alias);
    const excludeSuffixes = typeof aliasConfig === "string" ? [] : aliasConfig.excludeSuffixes || [];
    const suffixGuard = excludeSuffixes.length
      ? `(?!\\s*(?:${excludeSuffixes.map(escapeRegExp).join("|")}))`
      : "";
    return new RegExp(`(^|[^A-Za-z0-9.+#-])${escaped}${suffixGuard}([^A-Za-z0-9.+#-]|$)`, flags).test(text);
  }

  // ── 中文关键词走模糊子串匹配 ──
  const normalizedText = normalizeChinese(text);
  const normalizedAlias = normalizeChinese(alias);

  // 优先精确包含（最可靠）
  if (flags === "i" ? text.toLowerCase().includes(alias.toLowerCase()) : text.includes(alias)) return true;
  // 规范化后包含（处理"分布式"→"分布式系统"这类后缀差异）
  return normalizedText.includes(normalizedAlias) || normalizedAlias.includes(normalizedText.slice(0, normalizedText.length));
}

function cleanText(value) {
  return String(value || "").replace(/\u200b/g, "").trim();
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function slugify(value) {
  return encodeURIComponent(value).replace(/%/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

