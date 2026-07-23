import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildSkillDagModel,
  evaluateSkillDag,
  progressWordParts,
  skillMatchesQuery,
  suggestedSkillRowsForCategory,
} from "./skillDag.js";
import { useI18n } from "./i18n.jsx";

const VIEWBOX = { width: 1000, height: 550 };
const CLUSTER_CENTERS = {
  "web-client": { x: 150, y: 300 },
  backend: { x: 400, y: 300 },
  data: { x: 650, y: 300 },
  quality: { x: 900, y: 300 },
  languages: { x: 110, y: 470 },
  systems: { x: 300, y: 470 },
  "ai-agent": { x: 500, y: 470 },
  "ai-model": { x: 700, y: 470 },
  cloud: { x: 850, y: 470 },
};

export function SkillDag({ graph, companyLabel, selectedSkillIds, onToggleSkill, selectedCategoryId, onSelectCategory }) {
  const { t } = useI18n();
  const model = useMemo(() => buildSkillDagModel(graph), [graph]);
  const initialLayout = useMemo(() => buildInitialLayout(model), [model]);
  const [positions, setPositions] = useState(initialLayout.positions);
  const [skillQuery, setSkillQuery] = useState("");
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const selected = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds]);
  const matches = useMemo(() => evaluateSkillDag(model, selected), [model, selected]);
  const matchByCategoryId = new Map(matches.map((match) => [match.category.id, match]));
  const recommendedCategoryId = matches.find((match) => match.matchedCount > 0)?.category.id || null;


  const startDrag = (event, nodeId) => {
    const point = clientPointToSvg(event, svgRef.current);
    const position = positions[nodeId];
    if (!point || !position) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      nodeId,
      pointerId: event.pointerId,
      offsetX: point.x - position.x,
      offsetY: point.y - position.y,
      startX: point.x,
      startY: point.y,
      moved: false,
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = clientPointToSvg(event, svgRef.current);
    if (!point) return;
    if (Math.hypot(point.x - drag.startX, point.y - drag.startY) > 4) drag.moved = true;
    setPositions((current) => ({
      ...current,
      [drag.nodeId]: {
        x: clamp(point.x - drag.offsetX, 42, VIEWBOX.width - 42),
        y: clamp(point.y - drag.offsetY, 52, VIEWBOX.height - 48),
      },
    }));
  };

  const finishDrag = (event, { skillId = null, categoryId = null } = {}) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    if (drag.moved) return;
    if (skillId) onToggleSkill(skillId);
    if (categoryId) onSelectCategory?.(categoryId);
  };

  return (
    <div className="skill-dag-shell">
      <Link
        className="skill-dag-company"
        to="/galaxy"
        aria-live="polite"
        title={t("点击返回岗位宇宙")}
        aria-label={t("返回岗位宇宙查看 {company}", { company: companyLabel || t("全部") })}
      >
        <span>{t("当前公司")}</span>
        <strong>{companyLabel || t("全部")}</strong>
      </Link>
      <div className="skill-dag-heading">
        <label className="skill-dag-search">
          <input
            type="search"
            value={skillQuery}
            placeholder={t("输入技能关键词查询")}
            onChange={(event) => setSkillQuery(event.target.value)}
          />
        </label>
      </div>
      <svg
        ref={svgRef}
        className="skill-dag-map"
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        role="group"
        aria-label={t("可拖动的岗位大类与技能加点图")}
      >
        
        {model.categories.map((category) => {
          const position = positions[category.id];
          if (!position) return null;
          const match = matchByCategoryId.get(category.id);
          const highlighted = (match?.matchedCount || 0) > 0;
          const recommended = category.id === recommendedCategoryId;
          const categorySelected = category.id === selectedCategoryId;
          const progressWord = category.progressWord || category.label;
          const wordParts = progressWordParts(
            progressWord,
            match?.matchedCount || 0,
            match?.total || 3,
            match?.unlocked,
          );
          return (
            <g
              key={category.id}
              className={`skill-dag-category${highlighted ? " is-matched" : ""}${recommended ? " is-recommended" : ""}${match?.unlocked ? " is-unlocked" : ""}${categorySelected ? " is-selected" : ""}`}
              transform={`translate(${position.x} ${position.y})`}
              role="button"
              tabIndex="0"
              aria-pressed={categorySelected}
              aria-label={`${t(category.label)}, ${t("匹配 {matched}/{total}", { matched: match?.matchedCount || 0, total: match?.total || 3 })}`}
              onPointerDown={(event) => startDrag(event, category.id)}
              onPointerMove={moveDrag}
              onPointerUp={(event) => finishDrag(event, { categoryId: category.id })}
              onPointerCancel={(event) => finishDrag(event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCategory?.(category.id);
                }
              }}
            >
              <g className="skill-dag-category-visual" style={{ "--category-color": category.color }}>
                <rect className="skill-dag-category-halo" x="-72" y="-56" width="144" height="114" rx="16" />
                <rect
                  className="skill-dag-category-core"
                  x="-69"
                  y="-53"
                  width="138"
                  height="108"
                  rx="14"
                />
                <text className="skill-dag-progress-word" textAnchor="middle" y="-2">
                  <tspan className="is-lit">{wordParts.lit}</tspan>
                  <tspan>{wordParts.dim}</tspan>
                </text>
                <text className="skill-dag-category-label" textAnchor="middle" y="26">{t(category.label)}</text>
                <text className="skill-dag-category-score" textAnchor="middle" y="42">
                  {match?.unlocked ? t("已点亮") : `${match?.matchedCount || 0}/${match?.total || 3}`}
                </text>
              </g>
            </g>
          );
        })}

        {model.skills.map((skill) => {
          const position = positions[skill.id];
          if (!position) return null;
          const active = selected.has(skill.id);
          const searchActive = Boolean(skillQuery.trim());
          const searchMatch = searchActive && skillMatchesQuery(skill.label, skillQuery);
          const labelLines = skillLabelLines(t(skill.label));
          return (
            <g
              key={skill.id}
              className={`skill-dag-skill${active ? " is-selected" : ""}${searchMatch ? " is-search-match" : ""}${searchActive && !searchMatch ? " is-search-dimmed" : ""}`}
              transform={`translate(${position.x} ${position.y})`}
              role="button"
              tabIndex="0"
              aria-pressed={active}
              aria-label={`${t(skill.label)}, ${active ? t("已选择") : t("未选择")}`}
              onPointerDown={(event) => startDrag(event, skill.id)}
              onPointerMove={moveDrag}
              onPointerUp={(event) => finishDrag(event, { skillId: skill.id })}
              onPointerCancel={(event) => finishDrag(event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleSkill(skill.id);
                }
              }}
            >
              <g className="skill-dag-skill-visual">
                <circle className="skill-dag-skill-core" r="28" />
                <text className="skill-dag-skill-label" textAnchor="middle">
                  {labelLines.map((line, index) => (
                    <tspan key={`${line}:${index}`} x="0" y={(index - (labelLines.length - 1) / 2) * 8 + 2}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SkillDagPanel({ graph, selectedSkillIds, onToggleSkill, selectedCategoryId }) {
  const { t } = useI18n();
  const model = useMemo(() => buildSkillDagModel(graph), [graph]);
  const matches = useMemo(() => evaluateSkillDag(model, selectedSkillIds), [model, selectedSkillIds]);
  const selected = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds]);
  const selectedSkills = selectedSkillIds.map((skillId) => graph.nodeById.get(skillId)).filter(Boolean);
  const recommendations = matches.filter((match) => match.matchedCount > 0).slice(0, 3);
  const selectedCategoryMatch = matches.find((match) => match.category.id === selectedCategoryId) || null;
  const requiredSkills = selectedCategoryMatch?.best?.skills || [];
  const litRequiredSkills = requiredSkills.filter((skill) => selected.has(skill.id));

  return (
    <aside className="info-panel skill-dag-panel">
      <div className="panel-section">
        <p className="panel-kicker">{t("技能加点")}</p>
        <h2>{selectedSkills.length > 0 ? t("{count} 项技能已选择", { count: selectedSkills.length }) : t("规划职业方向")}</h2>
        <p className="muted">{t("点击上方岗位大类查看技能要求；点击下方技能进行加点。")}</p>
      </div>

      <div className="panel-section">
        <h3>{t("大类技能要求")}</h3>
        {selectedCategoryMatch ? (
          <div
            className="skill-dag-category-detail"
            style={{ "--category-color": selectedCategoryMatch.category.color }}
          >
            <div className="skill-dag-category-detail-heading">
              <strong>{t(selectedCategoryMatch.category.label)}</strong>
              <em>{selectedCategoryMatch.matchedCount}/{selectedCategoryMatch.total}</em>
            </div>
            <small>{t("当前高频技能组合")}</small>
            <div className="skill-dag-required-skills">
              {requiredSkills.map((skill) => (
                <span key={skill.id} className={selected.has(skill.id) ? "is-lit" : ""}>
                  {t(skill.label)}
                </span>
              ))}
            </div>
            <small>{t("目前已点亮的技能")}</small>
            {litRequiredSkills.length > 0 ? (
              <div className="skill-dag-lit-skills">
                {litRequiredSkills.map((skill) => <span key={skill.id}>{t(skill.label)}</span>)}
              </div>
            ) : (
              <p className="muted">{t("该组合暂未点亮任何技能。")}</p>
            )}
          </div>
        ) : (
          <p className="muted">{t("点击上方任意岗位大类，即可查看所需技能与当前进度。")}</p>
        )}
      </div>

      <div className="panel-section">
        <h3>{t("当前技能")}</h3>
        {selectedSkills.length > 0 ? (
          <div className="skill-dag-selected-list">
            {selectedSkills.map((skill) => (
              <button key={skill.id} type="button" onClick={() => onToggleSkill(skill.id)}>
                {t(skill.label)}<span>×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">{t("尚未选择技能。可以从任意技能开始，不限制前置顺序。")}</p>
        )}
      </div>

      <div className="panel-section">
        <h3>{t("推荐方向")}</h3>
        {recommendations.length > 0 ? (
          <div className="skill-dag-recommendations">
            {recommendations.map((match, index) => {
              const suggestedSkills = match.unlocked
                ? suggestedSkillRowsForCategory(graph, match.category.id, selectedSkillIds)
                : [];
              return (
                <div key={match.category.id} className={index === 0 ? "is-best" : ""}>
                  <span style={{ "--category-color": match.category.color }}>{index + 1}</span>
                  <strong>{t(match.category.label)}</strong>
                  <em>{match.matchedCount}/{match.total}</em>
                  <small>
                    {match.unlocked
                      ? t("高频组合已点亮")
                      : t("建议补充：{skills}", { skills: match.best.missingSkills.map((skill) => t(skill.label)).join(" / ") })}
                  </small>
                  {suggestedSkills.length > 0 ? (
                    <div className="skill-dag-suggestions">
                      <b>{t("建议补充的其他技能")}</b>
                      <ol>
                        {suggestedSkills.map((skill, skillIndex) => (
                          <li key={skill.id} className={skill.isLanguageGroup ? "is-language-group" : ""}>
                            <span>{skillIndex + 1}</span>
                            <strong>
                              {skill.isLanguageGroup
                                ? t("编程语言：{skills}", { skills: skill.languageLabels.map((label) => t(label)).join(" / ") })
                                : t(skill.label)}
                            </strong>
                            <em>{skill.isLanguageGroup ? t("{count} 门", { count: skill.languageCount }) : skill.countLabel}</em>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">{t("选择技能后，这里只展示匹配度最高的三个大类。")}</p>
        )}
      </div>
    </aside>
  );
}

function buildInitialLayout(model) {
  const positions = {};
  const FALLBACK_CENTER = CLUSTER_CENTERS["backend"];

  // Position category nodes (lowered so they sit below the company/search chrome)
  model.categories.forEach((category, index) => {
    const secondRow = index >= 6;
    const rowIndex = secondRow ? index - 6 : index;
    positions[category.id] = {
      x: (secondRow ? 170 : 90) + rowIndex * 164,
      y: secondRow ? 160 : 30,
    };
  });

  const spacing = 52;

  // Position skills that belong to exactly one group (pure cluster skills)
  model.skillGroups.forEach((group) => {
    const center = CLUSTER_CENTERS[group.id];
    if (!center) return;
    const skills = group.skills
      .filter((skill) => {
        const m = model.skillMemberships.get(skill.id) || [];
        return m.length === 1 || (group.id === "languages" && m.includes("languages"));
      })
      .sort((a, b) => hashString(a.id) - hashString(b.id));
    const columns = Math.max(1, Math.ceil(Math.sqrt(skills.length)));
    const rows = Math.max(1, Math.ceil(skills.length / columns));

    skills.forEach((skill, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowLength = Math.min(columns, skills.length - row * columns);
      const random = seededRandom(hashString(`${skill.id}:position`));
      positions[skill.id] = {
        x: center.x + (column - (rowLength - 1) / 2) * spacing + (random() - 0.5) * 6,
        y: center.y + (row - (rows - 1) / 2) * spacing + (random() - 0.5) * 6,
      };
    });
  });

  // Position skills shared across multiple groups (boundary skills)
  const sharedSkillsByBoundary = new Map();
  for (const skill of model.skills) {
    if (positions[skill.id]) continue;
    const memberships = model.skillMemberships.get(skill.id) || [];
    if (memberships.length < 2) continue;
    const boundaryId = [...memberships].sort().join(":");
    const boundarySkills = sharedSkillsByBoundary.get(boundaryId) || [];
    boundarySkills.push(skill);
    sharedSkillsByBoundary.set(boundaryId, boundarySkills);
  }

  for (const skills of sharedSkillsByBoundary.values()) {
    const memberships = model.skillMemberships.get(skills[0].id);
    const centers = memberships
      .map((groupId) => CLUSTER_CENTERS[groupId])
      .filter(Boolean);
    if (centers.length < 2) continue;

    const dx = centers[1].x - centers[0].x;
    const dy = centers[1].y - centers[0].y;
    const length = Math.hypot(dx, dy) || 1;
    const languageIndex = memberships.indexOf("languages");
    let center;
    if (languageIndex >= 0) {
      const languageCenter = centers[languageIndex];
      const otherCenters = centers.filter((_, idx) => idx !== languageIndex);
      const otherCenter = {
        x: otherCenters.reduce((total, point) => total + point.x, 0) / otherCenters.length,
        y: otherCenters.reduce((total, point) => total + point.y, 0) / otherCenters.length,
      };
      const languageDx = otherCenter.x - languageCenter.x;
      const languageDy = otherCenter.y - languageCenter.y;
      const languageLength = Math.hypot(languageDx, languageDy) || 1;
      center = {
        x: languageCenter.x + (languageDx / languageLength) * 74,
        y: languageCenter.y + (languageDy / languageLength) * 74,
      };
    } else {
      center = {
        x: centers.reduce((total, point) => total + point.x, 0) / centers.length,
        y: centers.reduce((total, point) => total + point.y, 0) / centers.length,
      };
    }

    skills.sort((a, b) => hashString(a.id) - hashString(b.id)).forEach((skill, index) => {
      const offset = (index - (skills.length - 1) / 2) * 42;
      positions[skill.id] = {
        x: center.x - (dy / length) * offset,
        y: center.y + (dx / length) * offset,
      };
    });
  }

  // Assign default positions to any remaining skills not yet positioned
  let defaultOffset = 0;
  for (const skill of model.skills) {
    if (!positions[skill.id]) {
      positions[skill.id] = {
        x: FALLBACK_CENTER.x + (defaultOffset % 10) * spacing,
        y: FALLBACK_CENTER.y + Math.floor(defaultOffset / 10) * spacing,
      };
      defaultOffset += 1;
    }
  }

  return { positions };
}

function clientPointToSvg(event, svg) {
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height,
  };
}

function skillLabelLines(label) {
  const lines = [];
  for (const word of label.split(/\s+/).filter(Boolean)) {
    for (let start = 0; start < word.length; start += 7) {
      lines.push(word.slice(start, start + 7));
    }
  }
  return lines;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
