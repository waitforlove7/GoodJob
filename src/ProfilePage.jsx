import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileUp,
  LoaderCircle,
  Search,
  Sparkles,
  Star,
  Target,
  User,
} from "lucide-react";
import jobsPayload from "../bytedance_jobs.json";
import { buildConstellationLayout, getConstellationViewBox } from "./constellationLayout.js";
import { buildJobGraph } from "./jobGraph.js";
import {
  loadMasteredSkillIds,
  loadProfile,
  saveMasteredSkillIds,
  saveProfile,
} from "./profileStorage.js";
import { parseResumeFile } from "./resumeParser.js";
import {
  extractResumeSkills,
  matchJobsBySkillIds,
  recommendLearningSkills,
} from "./resumeMatch.js";
import {
  buildSkillDagModel,
  evaluateSkillDag,
  suggestedSkillRowsForCategory,
} from "./skillDag.js";

const VIEWBOX = getConstellationViewBox();

function starPoints(cx, cy, outerR, innerR, points = 5) {
  const coords = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * index - Math.PI / 2;
    coords.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return coords.join(" ");
}

export function ProfilePage() {
  const graph = useMemo(() => buildJobGraph(jobsPayload), []);
  const model = useMemo(() => buildSkillDagModel(graph), [graph]);
  const layout = useMemo(() => buildConstellationLayout(model), [model]);

  const [profile, setProfile] = useState(loadProfile);
  const [masteredSkillIds, setMasteredSkillIds] = useState(loadMasteredSkillIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSkillId, setFocusSkillId] = useState(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeError, setResumeError] = useState(null);
  const fileInputRef = useRef(null);
  const svgRef = useRef(null);

  const mastered = useMemo(() => new Set(masteredSkillIds), [masteredSkillIds]);
  const matches = useMemo(() => evaluateSkillDag(model, mastered), [model, mastered]);
  const unlockedCount = matches.filter((match) => match.unlocked).length;
  const topMatch = matches[0] || null;
  const recommendedCategoryId = topMatch?.matchedCount >= 2 ? topMatch.category.id : null;

  const resumeSkills = useMemo(
    () => extractResumeSkills(graph, profile.resumeText),
    [graph, profile.resumeText],
  );
  const resumeSkillIds = useMemo(() => resumeSkills.map((skill) => skill.id), [resumeSkills]);
  const jobMatches = useMemo(
    () => matchJobsBySkillIds(graph, resumeSkillIds, 5),
    [graph, resumeSkillIds],
  );
  const resumeLearningSkills = useMemo(
    () => recommendLearningSkills(graph, resumeSkillIds, 8),
    [graph, resumeSkillIds],
  );

  const suggestions = useMemo(() => {
    if (!topMatch) return [];
    return suggestedSkillRowsForCategory(graph, topMatch.category.id, masteredSkillIds, 5);
  }, [graph, topMatch, masteredSkillIds]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return model.skills
      .filter((skill) => skill.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [model.skills, searchQuery]);

  useEffect(() => {
    saveMasteredSkillIds(masteredSkillIds);
  }, [masteredSkillIds]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const toggleSkill = (skillId) => {
    setMasteredSkillIds((current) =>
      current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId],
    );
  };

  const focusSkill = (skillId) => {
    setFocusSkillId(skillId);
    setSearchQuery(model.skills.find((skill) => skill.id === skillId)?.label || "");
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setResumeParsing(true);
    setResumeError(null);
    try {
      const text = await parseResumeFile(file);
      setProfile((current) => ({
        ...current,
        resumeText: text,
        resumeFileName: file.name,
      }));
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : "简历解析失败");
    } finally {
      setResumeParsing(false);
    }
  };

  const clearResume = () => {
    setResumeError(null);
    setProfile((current) => ({
      ...current,
      resumeText: "",
      resumeFileName: "",
    }));
  };

  const progressPercent = model.skills.length
    ? Math.round((mastered.size / model.skills.length) * 100)
    : 0;

  return (
    <main className="personal-shell">
      <header className="personal-topbar">
        <div className="personal-topbar-left">
          <a className="personal-back" href="#top">
            <ArrowLeft size={14} />
            返回星图
          </a>
          <div className="personal-user">
            <span className="personal-avatar"><User size={16} /></span>
            <div>
              <input
                className="personal-name-input"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                aria-label="用户名"
              />
              <input
                className="personal-email-input"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                aria-label="邮箱"
              />
            </div>
          </div>
        </div>
        <div className="personal-topbar-stats">
          <span><Star size={13} /> 已点亮 {mastered.size}/{model.skills.length}</span>
          <span><Sparkles size={13} /> 星座 {unlockedCount}/{model.categories.length}</span>
          <span><Target size={13} /> 进度 {progressPercent}%</span>
        </div>
      </header>

      <div className="personal-body">
        <section className="personal-constellation-pane" aria-label="技能星座图">
          <svg
            ref={svgRef}
            className="personal-constellation-map"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            role="group"
            aria-label="技能星座全景"
          >
            {matches.map((match) => {
              const pattern = layout.categoryPatterns[match.category.id] || [];
              const center = layout.positions[match.category.id];
              if (!center || pattern.length === 0) return null;
              const points = pattern.map((point) => `${point.x},${point.y}`).join(" ");
              return (
                <g key={match.category.id} className={`personal-category-constellation${match.unlocked ? " is-unlocked" : match.matchedCount > 0 ? " is-active" : ""}`}>
                  <polyline points={points} className="personal-constellation-lines" />
                  {pattern.map((point, index) => (
                    <circle key={`${match.category.id}-${index}`} cx={point.x} cy={point.y} r={match.unlocked ? 2.8 : 2} className="personal-constellation-node" />
                  ))}
                  <circle cx={center.x} cy={center.y} r={match.unlocked ? 9 : 7} className="personal-category-star" />
                  <text x={center.x} y={center.y - 14} className="personal-category-label">{match.category.label}</text>
                </g>
              );
            })}

            {model.edges.map((edge) => {
              const from = layout.positions[edge.skillId];
              const to = layout.positions[edge.categoryId];
              if (!from || !to) return null;
              const active = mastered.has(edge.skillId);
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`personal-dag-edge${active ? " is-active" : ""}`}
                />
              );
            })}

            {model.skills.map((skill) => {
              const position = layout.positions[skill.id];
              if (!position) return null;
              const isMastered = mastered.has(skill.id);
              const isFocused = focusSkillId === skill.id;
              const isSearchHit = searchQuery && skill.label.toLowerCase().includes(searchQuery.trim().toLowerCase());
              return (
                <g
                  key={skill.id}
                  className={`personal-skill-star${isMastered ? " is-mastered" : ""}${isFocused ? " is-focused" : ""}${isSearchHit ? " is-search-hit" : ""}`}
                  onClick={() => toggleSkill(skill.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleSkill(skill.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${skill.label}${isMastered ? "，已点亮" : "，未点亮"}`}
                  aria-pressed={isMastered}
                >
                  <polygon points={starPoints(position.x, position.y, isMastered ? 7 : 5.5, isMastered ? 3.2 : 2.5)} className="personal-star-shape" />
                  <text x={position.x} y={position.y + 14} className="personal-skill-label">{skill.label}</text>
                </g>
              );
            })}
          </svg>
        </section>

        <aside className="personal-side-pane">
          <div className="personal-flow">
            <span className={searchQuery ? "is-done" : "is-current"}>① 搜索技能</span>
            <ArrowRight size={12} />
            <span className={mastered.size > 0 ? "is-done" : searchQuery ? "is-current" : ""}>② 点亮星标</span>
            <ArrowRight size={12} />
            <span className={unlockedCount > 0 ? "is-done" : mastered.size >= 2 ? "is-current" : ""}>③ 点亮大类星座</span>
          </div>

          <label className="personal-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="搜索技能，回车定位星标"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) focusSkill(searchResults[0].id);
              }}
            />
          </label>

          {searchResults.length > 0 && (
            <ul className="personal-search-results">
              {searchResults.map((skill) => (
                <li key={skill.id}>
                  <button type="button" onClick={() => focusSkill(skill.id)}>
                    {skill.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <section className="personal-card">
            <h3>大类星座进度</h3>
            <ul className="personal-category-list">
              {matches.map((match) => (
                <li key={match.category.id} className={match.unlocked ? "is-unlocked" : ""}>
                  <strong>{match.category.label}</strong>
                  <span>{match.matchedCount}/{match.total}</span>
                  {match.unlocked ? <em>已点亮</em> : match.best ? (
                    <small>还差：{match.best.missingSkills.map((skill) => skill.label).join("、") || "—"}</small>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="personal-card">
            <h3>下一步学习建议</h3>
            {topMatch ? (
              <>
                <p className="personal-hint">
                  当前最接近方向：<strong>{topMatch.category.label}</strong>
                  （{topMatch.matchedCount}/{topMatch.total}）
                </p>
                <ol className="personal-suggestions">
                  {suggestions.map((row, index) => (
                    <li key={row.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!row.isLanguageGroup) focusSkill(row.id);
                        }}
                      >
                        {row.label}
                      </button>
                      <em>{row.countLabel}</em>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="personal-hint">先搜索并点亮 1-2 个技能，系统将按 DAG 推荐下一步。</p>
            )}
          </section>

          <section className="personal-card personal-resume-card">
            <h3>简历解析</h3>
            <div className="personal-upload-row">
              <input
                ref={fileInputRef}
                className="personal-file-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeUpload}
              />
              <button
                type="button"
                className="personal-upload-btn"
                disabled={resumeParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                {resumeParsing ? <LoaderCircle size={14} className="personal-spin" /> : <FileUp size={14} />}
                {resumeParsing ? "解析中…" : "上传简历 (.docx / .pdf)"}
              </button>
              {profile.resumeFileName ? (
                <button type="button" className="personal-clear-btn" onClick={clearResume}>
                  清除
                </button>
              ) : null}
            </div>
            {profile.resumeFileName ? (
              <p className="personal-file-name">已上传：{profile.resumeFileName}</p>
            ) : (
              <p className="personal-hint">上传完整简历后，将自动抽取技能并推荐岗位与学习方向。</p>
            )}
            {resumeError ? <p className="personal-error">{resumeError}</p> : null}

            <div className="personal-resume-block">
              <h4>提取到的技能关键词</h4>
              {resumeSkills.length > 0 ? (
                <div className="personal-skill-chips">
                  {resumeSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className="personal-skill-chip"
                      onClick={() => focusSkill(skill.id)}
                    >
                      {skill.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="personal-empty">暂无提取结果</p>
              )}
            </div>

            <div className="personal-resume-block">
              <h4>推荐岗位</h4>
              <ul className="personal-job-matches">
                {jobMatches.length > 0 ? jobMatches.map(({ job, score, intersection }) => (
                  <li key={job.id}>
                    <a href={job.url} target="_blank" rel="noreferrer">
                      <strong>{job.label}</strong>
                      <span>{(score * 100).toFixed(0)}% 匹配 · {intersection} 项技能命中</span>
                    </a>
                  </li>
                )) : (
                  <li className="personal-empty">上传简历后显示推荐岗位</li>
                )}
              </ul>
            </div>

            <div className="personal-resume-block">
              <h4>推荐学习技能</h4>
              {resumeLearningSkills.length > 0 ? (
                <ol className="personal-suggestions">
                  {resumeLearningSkills.map((row, index) => (
                    <li key={row.skill.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <button type="button" onClick={() => focusSkill(row.skill.id)}>
                        {row.skill.label}
                      </button>
                      <em>{row.jobHits} 个岗位需要</em>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="personal-empty">根据简历差距生成学习建议</p>
              )}
            </div>
          </section>

          {recommendedCategoryId && (
            <p className="personal-focus-note">
              推荐关注星座：<strong>{topMatch.category.label}</strong>
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
