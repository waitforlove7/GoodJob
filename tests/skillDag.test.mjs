import assert from "node:assert/strict";
import { test } from "node:test";
import jobsPayload from "./fixtures/example.json" with { type: "json" };
import { buildJobGraph } from "../src/jobGraph.js";
import {
  CATEGORY_CONSTELLATIONS,
  CATEGORY_PROGRESS_WORDS,
  buildSkillDagModel,
  evaluateSkillDag,
  progressWordParts,
  skillMatchesQuery,
  suggestedSkillRowsForCategory,
} from "../src/skillDag.js";

test("defines a valid abstract constellation for every DAG category", () => {
  assert.equal(Object.keys(CATEGORY_CONSTELLATIONS).length, 11);

  Object.values(CATEGORY_CONSTELLATIONS).forEach((constellation) => {
    assert.equal(constellation.points.length, 9);
    assert.ok(constellation.links.length >= 8);
    constellation.links.forEach(([from, to]) => {
      assert.ok(from >= 0 && from < constellation.points.length);
      assert.ok(to >= 0 && to < constellation.points.length);
      assert.notEqual(from, to);
    });
  });
});

test("defines progressive words and reveals Front in three stages", () => {
  assert.equal(Object.keys(CATEGORY_PROGRESS_WORDS).length, 11);
  assert.deepEqual(progressWordParts("Front", 0, 3), { lit: "", dim: "Front" });
  assert.deepEqual(progressWordParts("Front", 1, 3), { lit: "Fr", dim: "ont" });
  assert.deepEqual(progressWordParts("Front", 2, 3), { lit: "Fron", dim: "t" });
  assert.deepEqual(progressWordParts("Front", 3, 3), { lit: "Front", dim: "" });
});

test("fuzzy skill matching supports substrings, separators, typos, and reset", () => {
  assert.equal(skillMatchesQuery("Python", "pyth"), true);
  assert.equal(skillMatchesQuery("Python", "pythn"), true);
  assert.equal(skillMatchesQuery("JS/TS", "jsts"), true);
  assert.equal(skillMatchesQuery("机器学习", "机器"), true);
  assert.equal(skillMatchesQuery("Python", "java"), false);
  assert.equal(skillMatchesQuery("Python", ""), false);
});

test("builds a DAG with every skill and without product or other endpoints", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);

  assert.equal(model.skills.length, graph.skills.length);
  assert.equal(model.categories.some((category) => category.key === "product"), false);
  assert.equal(model.categories.some((category) => category.key === "other"), false);
  assert.ok(model.edges.length > 0);
});

test("groups skills for DAG and handles uncovered skills", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);
  const clusteredSkillIds = model.skillGroups.flatMap((group) => group.skills.map((skill) => skill.id));
  const python = graph.skills.find((skill) => skill.label === "Python");

  assert.ok(new Set(clusteredSkillIds).size >= graph.skills.length - 15, "at most 15 skills may be outside DAG groups");
  assert.ok(clusteredSkillIds.length > graph.skills.length);
  assert.deepEqual(model.skillMemberships.get(python.id), ["languages", "ai-model"]);
  assert.deepEqual(model.skillGroups.slice(0, 2).map((group) => group.label), ["基础语言", "Web 与客户端"]);
});

test("binds each category's high-frequency skills to progressive constellation stars", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);

  model.categories.forEach((category) => {
    const expectedSkillIds = [...new Set(
      category.combinations.flatMap((combination) => combination.skills.map((skill) => skill.id)),
    )];
    const starSkillIds = category.constellation.stars
      .map((star) => star.skillId)
      .filter(Boolean);

    assert.deepEqual(starSkillIds, expectedSkillIds);
    assert.equal(category.constellation.links.length >= 8, true);
  });
});

test("one selected shared skill progresses every related constellation", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);
  const categoriesBySkill = new Map();

  model.edges.forEach((edge) => {
    const categoryIds = categoriesBySkill.get(edge.skillId) || [];
    categoryIds.push(edge.categoryId);
    categoriesBySkill.set(edge.skillId, categoryIds);
  });

  const shared = [...categoriesBySkill.entries()].find(([, categoryIds]) => categoryIds.length > 1);
  assert.ok(shared, "fixture should contain a skill shared by multiple categories");

  const [skillId, expectedCategoryIds] = shared;
  const progressedCategoryIds = evaluateSkillDag(model, [skillId])
    .filter((match) => match.matchedCount > 0)
    .map((match) => match.category.id);

  expectedCategoryIds.forEach((categoryId) => assert.ok(progressedCategoryIds.includes(categoryId)));
});

test("ranks only categories matched by selected skills", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);
  const backend = model.categories.find((category) => category.key === "backend");
  const selectedIds = backend.combinations[0].skills.slice(0, 2).map((skill) => skill.id);
  const matches = evaluateSkillDag(model, selectedIds);
  const backendMatch = matches.find((match) => match.category.id === backend.id);

  assert.equal(backendMatch.matchedCount, 2);
  assert.equal(backendMatch.unlocked, false);
  assert.equal(matches.filter((match) => match.matchedCount > 0).length < model.categories.length, true);
});

test("lights a category when one complete high-frequency combination is selected", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);
  const frontend = model.categories.find((category) => category.key === "frontend");
  const selectedIds = frontend.combinations[0].skills.map((skill) => skill.id);
  const match = evaluateSkillDag(model, selectedIds).find((item) => item.category.id === frontend.id);

  assert.equal(match.matchedCount, 3);
  assert.equal(match.unlocked, true);
  assert.deepEqual(match.best.missingSkills, []);
});

test("suggests five rows while combining unselected programming languages", () => {
  const graph = buildJobGraph(jobsPayload);
  const model = buildSkillDagModel(graph);
  const backend = model.categories.find((category) => category.key === "backend");
  const selectedIds = backend.combinations[0].skills.map((skill) => skill.id);
  const suggestions = suggestedSkillRowsForCategory(graph, backend.id, selectedIds);
  const languageRow = suggestions.find((skill) => skill.isLanguageGroup);
  const programmingLanguages = new Set(["Python", "C/C++", "Go", "Java", "JS/TS", "Rust"]);
  const ranking = graph.skillRankingByCategory.get(backend.id).filter((skill) => !selectedIds.includes(skill.id));
  const expectedLanguages = ranking.filter((skill) => programmingLanguages.has(skill.label));
  const expectedOtherSkills = ranking.filter((skill) => !programmingLanguages.has(skill.label)).slice(0, 4);

  assert.equal(suggestions.length, 5);
  assert.equal(suggestions.filter((skill) => skill.isLanguageGroup).length, 1);
  assert.equal(languageRow.label, `编程语言：${expectedLanguages.map((skill) => skill.label).join(" / ")}`);
  assert.equal(languageRow.label.includes("Go"), false);
  assert.deepEqual(
    suggestions.filter((skill) => !skill.isLanguageGroup).map((skill) => skill.label),
    expectedOtherSkills.map((skill) => skill.label),
  );
});
