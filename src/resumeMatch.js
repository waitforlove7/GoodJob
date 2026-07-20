import { extractSkills } from "./jobGraph.js";

export function extractSkillIdsFromText(graph, text) {
  const labels = extractSkills(text || "");
  const labelSet = new Set(labels);
  return graph.skills.filter((skill) => labelSet.has(skill.label)).map((skill) => skill.id);
}

export function extractResumeSkills(graph, text) {
  return extractSkillIdsFromText(graph, text)
    .map((id) => graph.nodeById.get(id))
    .filter(Boolean);
}

export function matchJobsBySkillIds(graph, skillIds, limit = 5) {
  const selected = new Set(skillIds);
  if (selected.size === 0) return [];

  return graph.jobs
    .map((job) => {
      const jobSkillSet = new Set(job.skillIds);
      let intersection = 0;
      for (const id of selected) {
        if (jobSkillSet.has(id)) intersection += 1;
      }
      const union = new Set([...selected, ...jobSkillSet]).size;
      const jaccard = union ? intersection / union : 0;
      const coverage = intersection / selected.size;
      return {
        job,
        intersection,
        score: jaccard * 0.35 + coverage * 0.65,
      };
    })
    .filter((row) => row.intersection > 0)
    .sort((a, b) => b.score - a.score || b.intersection - a.intersection)
    .slice(0, limit);
}

export function recommendLearningSkills(graph, resumeSkillIds, limit = 8) {
  const have = new Set(resumeSkillIds);
  if (have.size === 0) return [];

  const topJobs = matchJobsBySkillIds(graph, resumeSkillIds, 12);
  const counts = new Map();

  for (const { job } of topJobs) {
    for (const skillId of job.skillIds) {
      if (have.has(skillId)) continue;
      counts.set(skillId, (counts.get(skillId) || 0) + 1);
    }
  }

  const categoryBoost = new Map();
  for (const { job } of topJobs.slice(0, 5)) {
    const ranking = graph.skillRankingByCategory.get(job.categoryId) || [];
    ranking.slice(0, 12).forEach((skill, index) => {
      if (have.has(skill.id)) return;
      categoryBoost.set(skill.id, (categoryBoost.get(skill.id) || 0) + (12 - index));
    });
  }

  return [...counts.entries()]
    .map(([skillId, jobHits]) => {
      const skill = graph.nodeById.get(skillId);
      if (!skill) return null;
      return {
        skill,
        jobHits,
        boost: categoryBoost.get(skillId) || 0,
        score: jobHits * 2 + (categoryBoost.get(skillId) || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.jobHits - a.jobHits || a.skill.label.localeCompare(b.skill.label))
    .slice(0, limit);
}

export function mergeResumeAndMasteredSkills(graph, resumeText, masteredSkillIds) {
  const fromResume = extractSkillIdsFromText(graph, resumeText);
  return [...new Set([...masteredSkillIds, ...fromResume])];
}
