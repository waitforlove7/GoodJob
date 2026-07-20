import assert from "node:assert/strict";
import { test } from "node:test";
import jobsPayload from "../example.json" with { type: "json" };
import { buildJobGraph } from "./jobGraph.js";
import { extractSkillIdsFromText, matchJobsBySkillIds, recommendLearningSkills } from "./resumeMatch.js";

test("extracts skill ids from resume text", () => {
  const graph = buildJobGraph(jobsPayload);
  const ids = extractSkillIdsFromText(graph, "熟悉 Python、PyTorch 与 LLM 应用开发");
  assert.ok(ids.length >= 2);
});

test("ranks jobs by skill similarity", () => {
  const graph = buildJobGraph(jobsPayload);
  const python = graph.skills.find((skill) => skill.label === "Python");
  const matches = matchJobsBySkillIds(graph, [python.id], 3);
  assert.ok(matches.length > 0);
  assert.ok(matches[0].score > 0);
});

test("recommends learning skills missing from resume", () => {
  const graph = buildJobGraph(jobsPayload);
  const python = graph.skills.find((skill) => skill.label === "Python");
  const rows = recommendLearningSkills(graph, [python.id], 5);
  assert.ok(rows.length > 0);
  assert.equal(rows.some((row) => row.skill.id === python.id), false);
});
