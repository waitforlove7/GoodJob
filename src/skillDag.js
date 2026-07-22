const EXCLUDED_CATEGORY_KEYS = new Set(["product", "other"]);
const PROGRAMMING_LANGUAGE_LABELS = new Set(["Python", "C/C++", "Go", "Java", "JS/TS", "Rust"]);
export const CATEGORY_PROGRESS_WORDS = {
  frontend: "Front",
  backend: "Backend",
  ops: "DevOps",
  ai_agent: "AI Agent",
  algorithm: "f(x)",
  testing: "Test Loop",
  security: "Security",
  data: "Data",
  client: "Client",
  hardware: "CPU",
  systems: "TCP/IP",
};
export const CATEGORY_CONSTELLATIONS = {
  frontend: constellation(
    [[60, 8], [42, 25], [78, 25], [60, 31], [24, 40], [96, 40], [60, 47], [42, 65], [78, 65]],
    [[0, 3], [1, 3], [2, 3], [1, 4], [2, 5], [3, 6], [6, 7], [6, 8]],
  ),
  backend: constellation(
    [[18, 12], [60, 12], [104, 12], [18, 35], [60, 35], [104, 35], [18, 58], [60, 58], [104, 58]],
    [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [2, 5], [5, 8]],
  ),
  ops: constellation(
    [[60, 36], [60, 7], [87, 16], [108, 36], [87, 57], [60, 66], [33, 57], [12, 36], [33, 16]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8]],
  ),
  ai_agent: constellation(
    [[14, 12], [14, 36], [14, 60], [60, 12], [60, 36], [60, 60], [106, 12], [106, 36], [106, 60]],
    [[0, 3], [0, 4], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 6], [3, 7], [4, 6], [4, 7], [4, 8], [5, 7], [5, 8]],
  ),
  algorithm: {
    ...constellation(
      [[15, 11], [15, 34], [15, 61], [39, 11], [36, 34], [71, 16], [105, 58], [105, 16], [71, 58]],
      [[0, 1], [1, 2], [0, 3], [1, 4], [5, 6], [7, 8], [4, 5], [4, 8]],
    ),
    symbol: "f(x)",
  },
  testing: constellation(
    [[60, 7], [90, 15], [108, 36], [90, 58], [60, 66], [30, 58], [12, 36], [30, 15], [99, 8]],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [1, 8], [8, 2]],
  ),
  security: constellation(
    [[60, 7], [24, 18], [96, 18], [25, 39], [95, 39], [36, 57], [60, 67], [84, 57], [60, 35]],
    [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 7], [5, 6], [6, 7], [0, 8], [8, 6]],
  ),
  data: constellation(
    [[22, 13], [60, 7], [98, 13], [22, 35], [98, 35], [22, 57], [60, 65], [98, 57], [60, 35]],
    [[0, 1], [1, 2], [2, 0], [0, 3], [2, 4], [3, 5], [4, 7], [5, 6], [6, 7], [7, 5], [3, 8], [8, 4]],
  ),
  client: constellation(
    [[16, 9], [104, 9], [16, 48], [104, 48], [60, 48], [60, 59], [42, 66], [78, 66], [60, 28]],
    [[0, 1], [1, 3], [3, 2], [2, 0], [2, 4], [4, 3], [4, 5], [5, 6], [5, 7], [6, 7]],
  ),
  hardware: constellation(
    [[25, 10], [95, 10], [25, 62], [95, 62], [60, 36], [60, 10], [95, 36], [60, 62], [25, 36]],
    [[0, 1], [1, 3], [3, 2], [2, 0], [0, 4], [1, 4], [2, 4], [3, 4], [5, 4], [6, 4], [7, 4], [8, 4]],
  ),
  systems: constellation(
    [[60, 8], [32, 29], [88, 29], [14, 53], [38, 62], [54, 53], [70, 62], [86, 53], [108, 62]],
    [[0, 1], [0, 2], [1, 3], [1, 4], [1, 5], [2, 6], [2, 7], [2, 8]],
  ),
};
const SKILL_GROUPS = [
  { id: "languages", label: "基础语言", color: "#5b8cff", skills: ["Python", "C/C++", "Go", "Java", "JS/TS", "Rust"] },
  { id: "web-client", label: "Web 与客户端", color: "#32d6c7", skills: ["Android", "iOS", "Flutter", "Swift", "React", "Vue", "Svelte", "Webpack/Vite", "HTML/CSS", "JS/TS"] },
  { id: "backend", label: "后端架构", color: "#8b7cff", skills: ["分布式系统", "微服务", "RPC", "JS/TS", "Go", "Java", "Spring", "MyBatis", "MySQL", "Redis", "Kafka"] },
  { id: "data", label: "数据工程", color: "#4dc9ff", skills: ["MySQL", "Redis", "NoSQL", "RocksDB", "Pika", "Ceph", "Kafka", "Spark", "Flink", "Hadoop", "Hive", "ClickHouse", "Doris", "HBase", "SQL", "数据仓库", "数据湖"] },
  { id: "cloud", label: "云原生环境", color: "#6ee7a8", skills: ["Kubernetes", "Docker", "监控告警"] },
  { id: "ai-model", label: "AI 模型与算法", color: "#cf67ff", skills: ["TensorFlow", "PyTorch", "Transformer", "NLP", "CV", "LLM", "Fine-Tuning", "SFT", "RL", "RLHF", "机器学习", "深度学习", "推荐系统", "Python"] },
  { id: "ai-agent", label: "AI Agent 应用", color: "#ff66c4", skills: ["AIGC", "Multi Agent", "Agent Infra", "Tool Use", "Prompt Engineering", "LangGraph", "CrewAI", "OpenClaw", "Agent", "RAG", "ReAct", "LLM"] },
  { id: "systems", label: "系统、网络与硬件", color: "#ffad5c", skills: ["Linux", "RTOS", "Sensor", "驱动开发", "PCIe", "RDMA", "TCP/IP", "BGP", "VXLAN", "IDA", "WinDBG", "XPERF", "NVML", "NVIDIA-SMI", "CUDA-GDB", "C/C++", "Rust"] },
  { id: "quality", label: "测试与性能", color: "#ff6f78", skills: ["自动化测试", "性能优化", "JUnit"] },
];

export function buildSkillDagModel(graph) {
  const categories = graph.categories
    .filter((category) => !EXCLUDED_CATEGORY_KEYS.has(category.key))
    .map((category) => {
      const combinations = (graph.skillTripleRankingByCategory.get(category.id) || []).slice(0, 3);
      const constellationTemplate = CATEGORY_CONSTELLATIONS[category.key];
      const constellationSkills = uniqueSkills(combinations);
      return {
        ...category,
        combinations,
        progressWord: CATEGORY_PROGRESS_WORDS[category.key] || category.label,
        constellation: bindConstellation(constellationTemplate, constellationSkills),
      };
    });
  const edges = categories.flatMap((category) => {
    const skillIds = new Set(category.combinations.flatMap((combination) => combination.skills.map((skill) => skill.id)));
    return [...skillIds].map((skillId) => ({
      id: `${skillId}->${category.id}`,
      skillId,
      categoryId: category.id,
    }));
  });
  const relevantSkillIds = new Set(edges.map((edge) => edge.skillId));
  const skills = graph.skills.filter((skill) => relevantSkillIds.has(skill.id));
  const skillByLabel = new Map(graph.skills.map((skill) => [skill.label, skill]));
  const skillGroups = SKILL_GROUPS.map(({ skills, ...group }) => ({
    ...group,
    skills: skills
      .map((label) => skillByLabel.get(label))
      .filter((skill) => skill && relevantSkillIds.has(skill.id)),
  }));
  const skillMemberships = new Map(graph.skills.map((skill) => [
    skill.id,
    skillGroups.filter((group) => group.skills.some((item) => item.id === skill.id)).map((group) => group.id),
  ]));

  return { categories, skills, skillGroups, skillMemberships, edges };
}

function constellation(points, links) {
  return {
    points: points.map(([x, y], index) => ({
      id: `star-${index}`,
      x,
      y,
      size: index % 4 === 0 ? 2.8 : index % 3 === 0 ? 2.3 : 1.8,
    })),
    links,
  };
}

function uniqueSkills(combinations) {
  const skills = new Map();
  combinations.forEach((combination) => {
    combination.skills.forEach((skill) => {
      if (!skills.has(skill.id)) skills.set(skill.id, skill);
    });
  });
  return [...skills.values()];
}

function bindConstellation(template, skills) {
  if (!template) return { stars: [], links: [] };
  return {
    symbol: template.symbol || null,
    stars: template.points.map((point, index) => ({
      ...point,
      skill: skills[index] || null,
      skillId: skills[index]?.id || null,
    })),
    links: template.links.map(([from, to], index) => ({
      id: `segment-${index}`,
      from,
      to,
    })),
  };
}

export function evaluateSkillDag(model, selectedSkillIds) {
  const selected = selectedSkillIds instanceof Set ? selectedSkillIds : new Set(selectedSkillIds);
  return model.categories
    .map((category) => {
      const combinations = category.combinations
        .map((combination) => {
          const matchedSkills = combination.skills.filter((skill) => selected.has(skill.id));
          return {
            ...combination,
            matchedSkills,
            missingSkills: combination.skills.filter((skill) => !selected.has(skill.id)),
            matchedCount: matchedSkills.length,
          };
        })
        .sort((a, b) => b.matchedCount - a.matchedCount || b.count - a.count);
      const best = combinations[0] || null;
      return {
        category,
        best,
        matchedCount: best?.matchedCount || 0,
        total: best?.skills.length || 3,
        unlocked: Boolean(best && best.missingSkills.length === 0),
      };
    })
    .sort((a, b) =>
      b.matchedCount / b.total - a.matchedCount / a.total ||
      (b.best?.count || 0) - (a.best?.count || 0) ||
      a.category.label.localeCompare(b.category.label),
    );
}

export function skillMatchesQuery(label, query) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  if (normalizedLabel.includes(normalizedQuery)) return true;

  let queryIndex = 0;
  for (const character of normalizedLabel) {
    if (character === normalizedQuery[queryIndex]) queryIndex += 1;
    if (queryIndex === normalizedQuery.length) return true;
  }
  return false;
}

export function progressWordParts(word, matchedCount, total = 3, unlocked = false) {
  const characters = Array.from(String(word || ""));
  const safeTotal = Math.max(1, total);
  const progressLength = unlocked
    ? characters.length
    : Math.ceil(characters.length * (Math.max(0, matchedCount) / safeTotal));
  return {
    lit: characters.slice(0, progressLength).join(""),
    dim: characters.slice(progressLength).join(""),
  };
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\-_/+.()]+/g, "");
}

export function suggestedSkillRowsForCategory(graph, categoryId, selectedSkillIds, limit = 5) {
  const selected = selectedSkillIds instanceof Set ? selectedSkillIds : new Set(selectedSkillIds);
  const ranking = (graph.skillRankingByCategory.get(categoryId) || [])
    .filter((skill) => !selected.has(skill.id));
  const languages = ranking.filter((skill) => PROGRAMMING_LANGUAGE_LABELS.has(skill.label));
  const rows = [];
  let addedLanguages = false;

  ranking.forEach((skill) => {
    if (PROGRAMMING_LANGUAGE_LABELS.has(skill.label)) {
      if (!addedLanguages) {
        rows.push({
          id: `languages:${categoryId}`,
          label: `编程语言：${languages.map((language) => language.label).join(" / ")}`,
          countLabel: `${languages.length} 门`,
          languageLabels: languages.map((language) => language.label),
          languageCount: languages.length,
          isLanguageGroup: true,
        });
        addedLanguages = true;
      }
      return;
    }
    rows.push({ ...skill, countLabel: String(skill.count), isLanguageGroup: false });
  });

  return rows.slice(0, limit);
}
