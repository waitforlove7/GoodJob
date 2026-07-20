import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics, track } from "@vercel/analytics/react";
import { Activity, BriefcaseBusiness, Building2, Layers3, Search, Sparkles, User } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { buildJobGraph, jobsMatchingAllSkills, searchJobs, sortRelatedJobs } from "./jobGraph.js";
import { JobGalaxy } from "./JobGalaxy.jsx";
import { SkillDag, SkillDagPanel } from "./SkillDag.jsx";
import { ProfilePage } from "./ProfilePage.jsx";
import "./styles.css";
import { I18nProvider, useI18n } from "./i18n.jsx";
import {
  COMPANY_CONFIGS,
  COMPANY_KEYS,
  buildMergedOverrides,
  loadCompanyData,
  loadMergedData,
  loadRoleDetails,
} from "./adapters/index.js";

function App({ language, onLanguageChange }) {
  const { t } = useI18n();
  const [companyKey, setCompanyKey] = useState("all");
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [layerView, setLayerView] = useState("category");
  const [skillViewMode, setSkillViewMode] = useState("frequency");
  const [skillCategoryFilterId, setSkillCategoryFilterId] = useState(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [masteredSkillIds, setMasteredSkillIds] = useState([]);
  const [relatedJobId, setRelatedJobId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTargets, setProfileTargets] = useState([]);
  const [profileMasteredSkillIds, setProfileMasteredSkillIds] = useState([]);
  const graphCache = useRef(new Map());

  const handleCompanyChange = useCallback((nextCompanyKey) => {
    setCompanyKey(nextCompanyKey);
  }, []);

  useEffect(() => {
    const cacheKey = companyKey;
    const cached = graphCache.current.get(cacheKey);
    if (cached) {
      setGraph(cached);
      setSelected(null);
      setSelectedSkillIds([]);
      setMasteredSkillIds([]);
      setRelatedJobId(null);
      setSkillCategoryFilterId(null);
      setSkillViewMode("frequency");
      setLayerView("category");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSelected(null);
    setSelectedSkillIds([]);
    setMasteredSkillIds([]);
    setRelatedJobId(null);
    setSkillCategoryFilterId(null);
    setSkillViewMode("frequency");
    setLayerView("category");
    (async () => {
      try {
        let payload, overrides;
        if (companyKey === "all") {
          payload = await loadMergedData(COMPANY_KEYS);
          overrides = buildMergedOverrides(COMPANY_KEYS);
        } else {
          payload = await loadCompanyData(companyKey);
          overrides = buildMergedOverrides([companyKey]);
        }
        const g = buildJobGraph(payload, { source: payload.source, categoryOverrides: overrides });
        if (!cancelled) {
          graphCache.current.set(cacheKey, g);
          setGraph(g);
          setSelected(null);
        }
      } catch (err) {
        console.error("[JobCloud] Failed to load company data:", err);
        if (!cancelled) {
          setGraph({
            categories: [], jobs: [], skills: [], nodes: [], links: [],
            nodeById: new Map(), jobsByCategory: new Map(), jobsBySkill: new Map(),
            jobsBySkillAndCategory: new Map(), globalSkillRanking: [],
            skillRankingByCategory: new Map(), skillTripleRankingByCategory: new Map(),
            globalSkillVisuals: new Map(), skillVisualsByCategory: new Map(),
            stats: { totalJobs: 0, completeJobs: 0, completeRate: 0 },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyKey]);

  const handleSelect = useCallback((nextSelection) => {
    setRelatedJobId(null);
    setSkillCategoryFilterId(null);
    if (!nextSelection) {
      setSelected(null);
      setSelectedSkillIds([]);
      return;
    }
    const node = graph?.nodeById?.get(nextSelection.id);
    track("graph_node_selected", {
      node_type: nextSelection.type,
      node_label: node?.label || nextSelection.id,
    });
    const shouldClear =
      (nextSelection.type === "category" || nextSelection.type === "skill") &&
      selected?.type === nextSelection.type &&
      selected.id === nextSelection.id;
    setSelected(shouldClear ? null : nextSelection);
    setSelectedSkillIds(!shouldClear && nextSelection.type === "skill" ? [nextSelection.id] : []);
  }, [graph, selected]);

  const handleSkillSelect = useCallback((nextSelection, { additive = false } = {}) => {
    setRelatedJobId(null);
    if (!additive) {
      handleSelect(nextSelection);
      return;
    }

    setSkillCategoryFilterId(null);
    const isSelected = selectedSkillIds.includes(nextSelection.id);
    const nextSkillIds = isSelected
      ? selectedSkillIds.filter((skillId) => skillId !== nextSelection.id)
      : [...selectedSkillIds, nextSelection.id];
    setSelectedSkillIds(nextSkillIds);
    if (nextSkillIds.length === 0) {
      setSelected(null);
    } else if (!isSelected || selected?.id === nextSelection.id) {
      setSelected({ id: isSelected ? nextSkillIds.at(-1) : nextSelection.id, type: "skill" });
    }
  }, [handleSelect, selected, selectedSkillIds]);

  const selectedNode = selected ? graph?.nodeById?.get(selected.id) : null;
  const galaxySelection = relatedJobId ? { id: relatedJobId, type: "job" } : selected;
  const selectedCategory =
    selectedNode?.type === "category"
      ? selectedNode
      : selectedNode?.type === "job"
        ? graph?.nodeById?.get(selectedNode.categoryId)
        : null;
  const handleLayerViewChange = useCallback((nextView) => {
    if (nextView === layerView) {
      if (nextView === "skill") handleSelect(null);
      return;
    }
    setLayerView(nextView);
    handleSelect(null);
  }, [handleSelect, layerView]);

  const handleAddTarget = useCallback((target) => { setProfileTargets(prev => [...prev, target]); }, []);
  const handleRemoveTarget = useCallback((idx) => { setProfileTargets(prev => prev.filter((_, i) => i !== idx)); }, []);
  const handleToggleProfileSkill = useCallback((skillId) => { setProfileMasteredSkillIds(prev => prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]); }, []);

  const handleToggleMasteredSkill = useCallback((skillId) => {
    setMasteredSkillIds((current) =>
      current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId],
    );
  }, []);
  const handleSkillCategoryFilterChange = useCallback((categoryId) => {
    setRelatedJobId(null);
    setSkillCategoryFilterId(categoryId);
  }, []);
  const handleSkillViewModeChange = useCallback((nextMode) => {
    setRelatedJobId(null);
    setSkillViewMode(nextMode);
  }, []);

  if (!graph) {
    return (
      <main className="app-shell">
        <header className="site-header">
          <a className="brand" href="#top" aria-label={`GoodJob ${t("首页")}`}>
            <span className="brand-mark"><Sparkles size={16} /></span>
            <strong>GoodJob</strong>
            <small>Web Mining Group1</small>
          </a>
          <JobSearch disabled />
          <div className="header-actions">
            <button className="profile-header-btn" onClick={() => setShowProfile(true)} aria-label={t("profile_btn")}><User size={16} /></button>
            <LanguageToggle language={language} onChange={onLanguageChange} />
          </div>
        </header>
        <section className="workspace" id="explore">
          <div className="visualization-column">
            <CompanyToolbar
              companyKey={companyKey}
              onChange={handleCompanyChange}
              disabled
            />
            <div className="scene-wrap">
              <div className="loading-spinner" />
            </div>
          </div>
          <aside className="info-panel">
            <div className="panel-section">
              <p className="panel-kicker">{t("加载数据")}</p>
              <h2>{t("正在加载岗位数据...")}</h2>
              <p className="muted">{t("请稍候，正在获取公司招聘信息。")}</p>
            </div>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label={`GoodJob ${t("首页")}`}>
          <span className="brand-mark"><Sparkles size={16} /></span>
          <strong>GoodJob</strong>
          <small>Web Mining Group1</small>
        </a>
        <JobSearch graph={graph} onSelect={handleSelect} disabled={loading} />
        <div className="header-actions">
            <button className="profile-header-btn" onClick={() => setShowProfile(true)} aria-label={t("profile_btn")}><User size={16} /></button>
            <LanguageToggle language={language} onChange={onLanguageChange} />
          </div>
      </header>
        {showProfile ? (
          <div className="profile-shell">
            <ProfilePage
            graph={graph}
            profileTargets={profileTargets}
            profileMasteredSkillIds={profileMasteredSkillIds}
            onAddTarget={handleAddTarget}
            onRemoveTarget={handleRemoveTarget}
            onToggleProfileSkill={handleToggleProfileSkill}
            onClose={() => setShowProfile(false)}
            />
          </div>
        ) : (
        <>
        <section className="hero-panel" id="top">
        <div className="title-block">
          <h1>{t("看见岗位之间的")}<br /><em>{t("隐形连接")}</em></h1>
          <p>
            {t("把分散的职位描述变成一张可探索的技能星图。快速比较岗位大类、技能热度与职业方向，找到下一步最值得投入的能力。")}
          </p>
        </div>
        <div className="metric-grid" aria-label={t("数据概览")}>
          <Metric icon={<BriefcaseBusiness />} label={t("招聘发布")} value={graph.stats.totalJobs} />
          <Metric icon={<Building2 />} label={t("岗位角色")} value={graph.stats.roleCount ?? graph.jobs.length} />
          <Metric icon={<Layers3 />} label={t("大类")} value={graph.categories.length} />
          <Metric icon={<Activity />} label={t("技能")} value={graph.skills.length} />
          <Metric icon={<Search />} label={t("描述完整度")} value={`${graph.stats.completeRate}%`} />
        </div>
      </section>

      <section className={`workspace${loading ? " is-loading" : ""}`} id="explore" aria-busy={loading}>
        <div className="visualization-column">
          <CompanyToolbar companyKey={companyKey} onChange={handleCompanyChange} disabled={loading} />
          <div className="scene-wrap">
            <ViewToggle activeView={layerView} onChange={handleLayerViewChange} />
            {layerView === "skill" && (
              <SkillViewToggle activeView={skillViewMode} onChange={handleSkillViewModeChange} />
            )}
            {layerView === "skill" && skillViewMode === "dag" ? (
              <SkillDag
                graph={graph}
                selectedSkillIds={masteredSkillIds}
                onToggleSkill={handleToggleMasteredSkill}
              />
            ) : (
              <JobGalaxy
                graph={graph}
                selected={galaxySelection}
                selectedSkillIds={selectedSkillIds}
                onSelect={handleSelect}
                layerView={layerView}
                skillCategoryFilterId={selectedNode?.type === "skill" ? skillCategoryFilterId : null}
              />
            )}
            {loading ? (
              <div className="scene-loading-overlay" role="status" aria-live="polite">
                <div className="loading-spinner" />
                <strong>{t("正在切换数据源...")}</strong>
                <span>{t("当前布局保持不变，新图谱准备完成后将自动更新。")}</span>
              </div>
            ) : null}
          </div>
        </div>
        {layerView === "skill" && skillViewMode === "dag" ? (
          <SkillDagPanel
            graph={graph}
            selectedSkillIds={masteredSkillIds}
            onToggleSkill={handleToggleMasteredSkill}
          />
        ) : (
          <InfoPanel
            graph={graph}
            selectedNode={selectedNode}
            selectedCategory={selectedCategory}
            layerView={layerView}
            skillCategoryFilterId={skillCategoryFilterId}
            selectedSkillIds={selectedSkillIds}
            selectedRelatedJobId={relatedJobId}
            onSkillCategoryFilterChange={handleSkillCategoryFilterChange}
            onCategorySelect={(categoryId) => handleSelect(categoryId ? { id: categoryId, type: "category" } : null)}
            onRelatedJobSelect={(jobId) => setRelatedJobId((current) => (current === jobId ? null : jobId))}
            onSkillSelect={handleSkillSelect}
          />
        )}
      </section>
        </>
        )}
    </main>
  );
}

function CompanyToolbar({ companyKey, onChange, disabled = false }) {
  const { t } = useI18n();
  return (
    <div className="company-toolbar">
      <div className="company-toolbar-copy">
        <strong>{t("招聘数据源")}</strong>
        <span>{t("点击切换公司")}</span>
      </div>
      <div className="company-selector" role="tablist" aria-label={t("选择公司")}>
        <button
          type="button"
          role="tab"
          aria-selected={companyKey === "all"}
          className={companyKey === "all" ? "active" : ""}
          disabled={disabled}
          onClick={() => onChange("all")}
        >
          <Building2 size={14} />
          {t("全部")}
        </button>
        {COMPANY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={companyKey === key}
            className={companyKey === key ? "active" : ""}
            disabled={disabled}
            onClick={() => onChange(key)}
          >
            {t(COMPANY_CONFIGS[key].LABEL)}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageToggle({ language, onChange }) {
  const { t } = useI18n();
  return (
    <div className="language-toggle" role="group" aria-label={t("切换界面语言")}>
      <button
        type="button"
        className={language === "zh" ? "active" : ""}
        aria-pressed={language === "zh"}
        onClick={() => onChange("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}

function JobSearch({ graph = null, onSelect, disabled = false }) {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => (graph && query.trim() ? searchJobs(graph, query, 12) : []),
    [graph, query],
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  const selectJob = (job) => {
    onSelect?.({ id: job.id, type: "job" });
    setOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (results[0]) selectJob(results[0]);
  };

  return (
    <div className="header-search" ref={rootRef}>
      <form role="search" onSubmit={handleSubmit}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          placeholder={disabled ? t("正在准备岗位搜索...") : t("搜索岗位、技能、类别或公司")}
          aria-label={t("搜索岗位")}
          aria-expanded={open && Boolean(query.trim())}
          aria-controls="job-search-results"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        {query ? (
          <button
            className="search-clear"
            type="button"
            aria-label={t("清除搜索")}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
      </form>
      {open && query.trim() ? (
        <div className="search-results" id="job-search-results" role="listbox">
          {results.length > 0 ? (
            <>
              <div className="search-results-count">{t("显示最相关的 {count} 个岗位角色", { count: results.length })}</div>
              {results.map((job) => {
                const category = graph.nodeById.get(job.categoryId);
                return (
                  <button
                    key={job.id}
                    type="button"
                    role="option"
                    onClick={() => selectJob(job)}
                  >
                    <strong>{job.label}</strong>
                    <span>
                      {t(job.sourceLabel)} · {t(category?.label || "其他")} · {t("{count} 个招聘发布", { count: job.postingCount })}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <p>{t("没有匹配的岗位角色")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ViewToggle({ activeView, onChange }) {
  const { t } = useI18n();
  return (
    <div className="layer-legend" role="group" aria-label={t("图谱视图")}>
      {[
        ["category", t("大类")],
        ["skill", t("技能")],
      ].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={activeView === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function SkillViewToggle({ activeView, onChange }) {
  const { t } = useI18n();
  return (
    <div className="skill-view-toggle" role="group" aria-label={t("技能视图模式")}>
      {[
        ["frequency", t("频次分布")],
        ["dag", t("加点 DAG")],
      ].map(([id, label]) => (
        <button key={id} type="button" aria-pressed={activeView === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon">{React.cloneElement(icon, { size: 18 })}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function InfoPanel({
  graph,
  selectedNode,
  selectedCategory,
  layerView,
  skillCategoryFilterId,
  selectedSkillIds,
  selectedRelatedJobId,
  onSkillCategoryFilterChange,
  onCategorySelect,
  onRelatedJobSelect,
  onSkillSelect,
}) {
  const { t } = useI18n();
  const showSkillOverview = layerView === "skill";
  if (!selectedNode) {
    return (
      <InfoShell
        graph={graph}
        skillOverview={showSkillOverview}
        selectedSkillIds={selectedSkillIds}
        onPieCategoryChange={onCategorySelect}
        onSkillSelect={onSkillSelect}
      >
        <div className="panel-section">
          <p className="panel-kicker">{t("默认视图")}</p>
          <h2>{t("所有大类技能频次")}</h2>
          <p className="muted">
            {t("当前为全链接状态，展示全部大类下技能提及次数的汇总排序。点击大类或职位可以进入局部关系视图。")}
          </p>
        </div>
        <TopSkillList title={t("全部技能频次")} skills={graph.globalSkillRanking} />
      </InfoShell>
    );
  }

  if (selectedNode.type === "category") {
    return (
      <CategoryPanel
        graph={graph}
        category={selectedNode}
        skillOverview={showSkillOverview}
        selectedSkillIds={selectedSkillIds}
        selectedRelatedJobId={selectedRelatedJobId}
        onCategorySelect={onCategorySelect}
        onRelatedJobSelect={onRelatedJobSelect}
        onSkillSelect={onSkillSelect}
      />
    );
  }

  if (selectedNode.type === "job") {
    return (
      <JobRolePanel
        graph={graph}
        job={selectedNode}
        category={selectedCategory}
        skillOverview={showSkillOverview}
        selectedSkillIds={selectedSkillIds}
        onCategorySelect={onCategorySelect}
        onSkillSelect={onSkillSelect}
      />
    );
  }

  if (selectedNode.type === "skill") {
    return (
      <SkillPanel
        graph={graph}
        skill={selectedNode}
        skillOverview={showSkillOverview}
        selectedSkillIds={selectedSkillIds}
        activeCategoryId={skillCategoryFilterId}
        selectedRelatedJobId={selectedRelatedJobId}
        onCategoryFilterChange={onSkillCategoryFilterChange}
        onRelatedJobSelect={onRelatedJobSelect}
        onSkillSelect={onSkillSelect}
      />
    );
  }

  return null;
}

function JobRolePanel({
  graph,
  job,
  category,
  skillOverview,
  selectedSkillIds,
  onCategorySelect,
  onSkillSelect,
}) {
  const { t } = useI18n();
  const ranking = graph.skillRankingByCategory.get(job.categoryId) || [];
  const categoryFrequency = new Map(ranking.map((item) => [item.id, item.count]));
  const sortedSkills = job.skillIds
    .map((id) => graph.nodeById.get(id))
    .filter(Boolean)
    .sort((a, b) => (categoryFrequency.get(b.id) || 0) - (categoryFrequency.get(a.id) || 0));
  const detailState = useRoleDetails(job);

  return (
    <InfoShell
      graph={graph}
      activeCategoryId={category?.id}
      skillOverview={skillOverview}
      selectedSkillIds={selectedSkillIds}
      onPieCategoryChange={onCategorySelect}
      onSkillSelect={onSkillSelect}
    >
      <div className="panel-section">
        <p className="panel-kicker">{t("岗位角色")}</p>
        <h2>{job.label}</h2>
        <p className="muted">{t("所属大类：")}{t(category?.label || "其他")}</p>
        <RoleSummary job={job} />
      </div>
      <div className="panel-section">
        <h3>{t("技能要求")}</h3>
        {sortedSkills.length > 0 ? (
          <div className="skill-cloud">
            {sortedSkills.map((skill) => (
              <span key={skill.id}>
                {t(skill.label)}
                <b>{categoryFrequency.get(skill.id) || 1}</b>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">{t("这条岗位没有命中当前技能词典，可在词典配置中补充关键词。")}</p>
        )}
      </div>
      <RoleDetails job={job} {...detailState} />
    </InfoShell>
  );
}

function CategoryPanel({
  graph,
  category,
  skillOverview,
  selectedSkillIds,
  selectedRelatedJobId,
  onCategorySelect,
  onRelatedJobSelect,
  onSkillSelect,
}) {
  const { t } = useI18n();
  const jobs = sortRelatedJobs(graph.jobsByCategory.get(category.id) || [], category.key);
  const ranking = graph.skillRankingByCategory.get(category.id) || [];
  const combinations = graph.skillTripleRankingByCategory.get(category.id) || [];

  return (
    <InfoShell
      graph={graph}
      activeCategoryId={category.id}
      skillOverview={skillOverview}
      selectedSkillIds={selectedSkillIds}
      onPieCategoryChange={onCategorySelect}
      onSkillSelect={onSkillSelect}
    >
      <div className="panel-section">
        <p className="panel-kicker">{t("岗位大类")}</p>
        <h2>{t(category.label)}</h2>
        <p className="muted">
          {t("共 {jobs} 个细分岗位，命中 {skills} 个技能关键词。", { jobs: jobs.length, skills: ranking.length })}
        </p>
      </div>
      {!skillOverview && <SkillCombinationTable combinations={combinations.slice(0, 3)} />}
      <TopSkillList title={t("该类技能频次")} skills={ranking.slice(0, 10)} />
      <div className="panel-section">
        <h3>{t("关联职位")}</h3>
        <div className="job-list">
          {jobs.slice(0, 30).map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              category={category}
              active={job.id === selectedRelatedJobId}
              onToggle={() => onRelatedJobSelect(job.id)}
            />
          ))}
        </div>
      </div>
    </InfoShell>
  );
}

function SkillCombinationTable({ combinations }) {
  const { t } = useI18n();
  return (
    <div className="panel-section skill-combination-section">
      <h3>{t("高频三技能组合")}</h3>
      {combinations.length > 0 ? (
        <table className="skill-combination-table">
          <thead>
            <tr>
              <th>{t("技能组合")}</th>
              <th>{t("岗位")}</th>
              <th>{t("占比")}</th>
            </tr>
          </thead>
          <tbody>
            {combinations.map((combination) => (
              <tr key={combination.id}>
                <td>
                  <div className="skill-combination-chips">
                  {combination.skills.map((skill) => <span key={skill.id}>{t(skill.label)}</span>)}
                  </div>
                </td>
                <td>{combination.count}</td>
                <td>{(combination.share * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">{t("暂无满足统计条件的三技能组合。")}</p>
      )}
      <p className="skill-combination-note">{t("按同一岗位共同出现计数；已排除多门替代语言与同类框架堆叠。")}</p>
    </div>
  );
}

function SkillPanel({
  graph,
  skill,
  skillOverview,
  selectedSkillIds,
  activeCategoryId,
  selectedRelatedJobId,
  onCategoryFilterChange,
  onRelatedJobSelect,
  onSkillSelect,
}) {
  const { t } = useI18n();
  const activeSkillIds = selectedSkillIds.length > 0 ? selectedSkillIds : [skill.id];
  const selectedSkills = activeSkillIds.map((skillId) => graph.nodeById.get(skillId)).filter(Boolean);
  const isSkillCombination = selectedSkills.length > 1;
  const jobs = jobsMatchingAllSkills(graph, activeSkillIds);
  const groupedJobs = graph.categories
    .map((category) => ({
      category,
      jobs: sortRelatedJobs(jobs.filter((job) => job.categoryId === category.id), category.key),
    }))
    .filter((group) => group.jobs.length > 0)
    .sort((a, b) => b.jobs.length - a.jobs.length || a.category.label.localeCompare(b.category.label));
  const visibleGroups = activeCategoryId
    ? groupedJobs.filter((group) => group.category.id === activeCategoryId)
    : groupedJobs;

  const handleCategoryFilter = (categoryId) => {
    onCategoryFilterChange(categoryId);
  };

  return (
    <InfoShell
      graph={graph}
      pieSkill={skill}
      pieJobs={jobs}
      pieTitle={isSkillCombination ? t("技能组合分布") : t("技能分布")}
      skillOverview={skillOverview}
      selectedSkillIds={selectedSkillIds}
      activeCategoryId={activeCategoryId}
      onPieCategoryChange={handleCategoryFilter}
      onSkillSelect={onSkillSelect}
    >
      <div className="panel-section">
        <h3>
          {activeCategoryId
            ? `${t(graph.nodeById.get(activeCategoryId)?.label || "当前大类")} · ${t("相关岗位")}`
            : t("相关岗位")}
        </h3>
        <div className="category-job-groups">
          {visibleGroups.length > 0 ? (
            visibleGroups.map((group, index) => (
              <details key={group.category.id} className="category-job-group" open={index === 0}>
                <summary className="group-title">
                  <span>{t(group.category.label)}</span>
                  <b>{group.jobs.length}</b>
                </summary>
                <div className="job-list">
                  {group.jobs.map((job) => (
                    <JobListItem
                      key={job.id}
                      job={job}
                      category={group.category}
                      active={job.id === selectedRelatedJobId}
                      onToggle={() => onRelatedJobSelect(job.id)}
                    />
                  ))}
                </div>
              </details>
            ))
          ) : (
            <p className="muted">{t("该技能在当前大类中没有关联岗位。")}</p>
          )}
        </div>
      </div>
    </InfoShell>
  );
}

function InfoShell({
  graph,
  activeCategoryId,
  pieSkill,
  pieJobs,
  pieTitle,
  skillOverview,
  selectedSkillIds = [],
  onPieCategoryChange,
  onSkillSelect,
  children,
}) {
  return (
    <aside className="info-panel">
      {skillOverview && (
        <CategoryPieChart
          graph={graph}
          skillOverview
          selectedSkillIds={selectedSkillIds}
          onSkillSelect={onSkillSelect}
        />
      )}
      {(!skillOverview || pieSkill) && (
        <CategoryPieChart
          graph={graph}
          activeCategoryId={activeCategoryId}
          skill={pieSkill}
          filteredJobs={pieJobs}
          distributionTitle={pieTitle}
          onCategorySelect={onPieCategoryChange}
        />
      )}
      {children}
    </aside>
  );
}

const CategoryPieChart = React.memo(function CategoryPieChart({
  graph,
  activeCategoryId,
  skill,
  filteredJobs,
  distributionTitle,
  skillOverview,
  selectedSkillIds = [],
  onCategorySelect,
  onSkillSelect,
}) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(null);
  const isSkillDistribution = Boolean(skill || filteredJobs);
  const rows = useMemo(() => {
    if (skillOverview) {
      const total = graph.globalSkillRanking.reduce((sum, item) => sum + item.count, 0) || 1;
      const topSkills = graph.globalSkillRanking.slice(0, 15);
      const otherCount = graph.globalSkillRanking.slice(15).reduce((sum, item) => sum + item.count, 0);
      return [
        ...topSkills.map((item, index) => ({
          id: item.id,
          label: t(item.label),
          name: t(item.label),
          color: `hsl(${(index * 47 + 165) % 360} 68% 62%)`,
          count: item.count,
          value: item.count,
          percent: item.count / total,
          selectable: true,
        })),
        {
          id: "skill:other",
          label: t("其他技能"),
          name: t("其他技能"),
          color: "#6f7d8b",
          count: otherCount,
          value: otherCount,
          percent: otherCount / total,
          selectable: false,
        },
      ];
    }

    const total = filteredJobs
      ? filteredJobs.length || 1
      : skill
        ? graph.jobsBySkill.get(skill.id)?.length || 1
        : graph.stats.roleCount || graph.jobs.length || 1;
    const jobsByCategory = skill ? graph.jobsBySkillAndCategory.get(skill.id) : graph.jobsByCategory;
    return graph.categories
      .map((category) => {
        const count = filteredJobs
          ? filteredJobs.filter((job) => job.categoryId === category.id).length
          : jobsByCategory?.get(category.id)?.length || 0;
        return {
          id: category.id,
          label: t(category.label),
          name: t(category.label),
          color: category.color,
          count,
          value: count,
          percent: count / total,
        };
      })
      .filter((row) => isSkillDistribution || row.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [filteredJobs, graph, isSkillDistribution, skill, skillOverview, t]);
  const labelLayout = buildPieLabelLayout(rows);

  useEffect(() => {
    const nextIndex = rows.findIndex((row) => row.id === activeCategoryId);
    setActiveIndex(nextIndex >= 0 ? nextIndex : null);
  }, [activeCategoryId, rows]);

  const selectSlice = (index, event) => {
    if (!Number.isInteger(index)) return;
    const row = rows[index];
    if (!row || row.selectable === false) return;

    const nextIndex = activeIndex === index ? null : index;
    if (skillOverview) {
      onSkillSelect?.(
        { id: row.id, type: "skill" },
        { additive: Boolean(event?.ctrlKey || event?.metaKey) },
      );
      return;
    }
    setActiveIndex(nextIndex);
    if (onCategorySelect) {
      onCategorySelect(nextIndex === null ? null : row.id);
    }
  };

  return (
    <div className="panel-section pie-section">
      <p className="panel-kicker">{skillOverview ? t("技能频次分布") : isSkillDistribution ? distributionTitle || t("技能分布") : t("岗位分布")}</p>
      <div className="pie-layout">
        <div
          className="pie-chart"
          aria-label={skillOverview
            ? t("前十五技能频次分布饼图")
            : isSkillDistribution
              ? `${distributionTitle || t("当前技能")} ${t("大类占比饼图")}`
              : t("岗位大类分布饼图")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                outerRadius="60%"
                paddingAngle={1}
                stroke="none"
                labelLine={false}
                label={(props) => renderPieLabel(props, labelLayout, selectSlice)}
                shape={(props) => (
                  <ZoomablePieSector
                    {...props}
                    active={skillOverview ? selectedSkillIds.includes(props.payload?.id) : props.index === activeIndex}
                    selectable={props.payload?.selectable !== false}
                    onSelect={(event) => selectSlice(props.index, event)}
                  />
                )}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.id} fill={row.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip mode={skillOverview ? "skill-overview" : isSkillDistribution ? "skill" : "jobs"} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

function ZoomablePieSector({ active, selectable, onSelect, cx, cy, ...props }) {
  return (
    <Sector
      {...props}
      cx={cx}
      cy={cy}
      className={`pie-sector${active ? " is-active" : ""}${selectable ? "" : " is-static"}`}
      stroke={active ? "rgba(255, 255, 255, 0.9)" : "none"}
      strokeWidth={active ? 2 : 0}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      onPointerUp={selectable ? onSelect : undefined}
      onContextMenu={selectable ? (event) => event.preventDefault() : undefined}
    />
  );
}

function buildPieLabelLayout(rows) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const nonZeroCount = rows.filter((row) => row.value > 0).length;
  const availableAngle = 360 - nonZeroCount;
  let currentAngle = 0;
  const entries = rows.map((row, index) => {
    if (index > 0 && row.value > 0) currentAngle += 1;
    const angleSpan = (row.value / total) * availableAngle;
    const midAngle = currentAngle + angleSpan / 2;
    currentAngle += angleSpan;
    const angle = (-midAngle * Math.PI) / 180;
    return { index, side: Math.cos(angle) >= 0 ? 1 : -1, desiredY: Math.sin(angle) };
  });
  if (rows.length >= 8) {
    const verticalGroups = [entries.filter((entry) => entry.desiredY < 0), entries.filter((entry) => entry.desiredY >= 0)];
    for (const group of verticalGroups) {
      const sideCounts = new Map([
        [-1, group.filter((entry) => entry.side === -1).length],
        [1, group.filter((entry) => entry.side === 1).length],
      ]);
      const movableEntries = [...group].sort((a, b) => Math.abs(b.desiredY) - Math.abs(a.desiredY));
      for (const entry of movableEntries) {
        const otherSide = -entry.side;
        if (sideCounts.get(entry.side) <= sideCounts.get(otherSide) + 1) continue;
        sideCounts.set(entry.side, sideCounts.get(entry.side) - 1);
        sideCounts.set(otherSide, sideCounts.get(otherSide) + 1);
        entry.side = otherSide;
      }
    }
  }
  const layout = [];

  for (const side of [-1, 1]) {
    const sideEntries = entries.filter((entry) => entry.side === side).sort((a, b) => a.desiredY - b.desiredY);
    const desiredYs = sideEntries.map((entry) => entry.desiredY);
    sideEntries.forEach((entry, rank) => {
      layout[entry.index] = { side, rank, desiredYs };
    });
  }

  return layout;
}

function spreadPieLabelYs(desiredYs, cy, radius) {
  const labelEdgePadding = 18;
  const minY = cy - radius + labelEdgePadding;
  const maxY = cy + radius - labelEdgePadding;
  const positions = desiredYs.map((value) => cy + value * radius);
  const minGap = 24;

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], positions[index - 1] + minGap);
  }
  const overflow = positions.at(-1) - maxY;
  if (overflow > 0) positions.forEach((_, index) => { positions[index] -= overflow; });
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index], positions[index + 1] - minGap);
  }
  const underflow = minY - positions[0];
  if (underflow > 0) positions.forEach((_, index) => { positions[index] += underflow; });
  return positions;
}

function renderPieLabel({ cx, cy, midAngle, outerRadius, name, payload, index }, labelLayout, onSelect) {
  const angle = (-midAngle * Math.PI) / 180;
  const itemLayout = labelLayout[index];
  const side = itemLayout?.side || (Math.cos(angle) >= 0 ? 1 : -1);
  const color = payload?.color || "#dce8f4";
  const edgeX = cx + Math.cos(angle) * (outerRadius + 2);
  const edgeY = cy + Math.sin(angle) * (outerRadius + 2);
  const bendX = cx + Math.cos(angle) * (outerRadius + 14);
  const labelY = itemLayout
    ? spreadPieLabelYs(itemLayout.desiredYs, cy, outerRadius + 28)[itemLayout.rank]
    : cy + Math.sin(angle) * (outerRadius + 28);
  const naturalTextX = bendX + side * 16;
  const textX = side > 0 ? Math.min(naturalTextX, cx * 2 - 78) : Math.max(naturalTextX, 78);
  const lineEndX = textX - side * 4;
  const isSelectable = payload?.selectable !== false;
  const interactionProps = isSelectable
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `${name}：${payload?.count || 0}，${formatPercent(payload?.percent || 0)}`,
        onPointerUp: (event) => {
          event.stopPropagation();
          onSelect(index, event);
        },
        onContextMenu: (event) => event.preventDefault(),
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(index, event);
          }
        },
      }
    : {};

  return (
    <g>
      <polyline
        points={`${edgeX},${edgeY} ${bendX},${labelY} ${lineEndX},${labelY}`}
        fill="none"
        stroke={color}
        strokeOpacity="0.62"
      />
      <g
        className={`pie-data-label${isSelectable ? "" : " is-static"}`}
        {...interactionProps}
      >
        <rect x={side > 0 ? textX - 4 : textX - 92} y={labelY - 20} width="96" height="36" rx="4" fill="transparent" />
        <text
          className="pie-slice-label"
          x={textX}
          fill={color}
          textAnchor={side > 0 ? "start" : "end"}
        >
          <tspan x={textX} y={labelY - 6}>{name}</tspan>
          <tspan className="pie-slice-meta" x={textX} y={labelY + 8}>
            {payload?.count || 0} · {formatPercent(payload?.percent || 0)}
          </tspan>
        </text>
      </g>
    </g>
  );
}

function PieTooltip({ active, payload, mode }) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const countLabel = mode === "skill-overview"
    ? t("{count} 次提及", { count: row.count })
    : `${t("{count} 个岗位", { count: row.count })}${mode === "skill" ? t("提及") : ""}`;
  return (
    <div className="pie-tooltip">
      <strong>{row.label}</strong>
      <span>
        {countLabel} · {formatPercent(row.percent)}
      </span>
    </div>
  );
}

function formatPercent(value) {
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function JobListItem({ job, category, active, onToggle }) {
  return (
    <div className="job-list-item">
      <button className={active ? "active" : ""} type="button" onClick={onToggle}>
        {job.label}
      </button>
      {active ? <JobInfoCard job={job} category={category} embedded /> : null}
    </div>
  );
}

function JobInfoCard({ job, category, embedded = false }) {
  const { t } = useI18n();
  const detailState = useRoleDetails(job);
  return (
    <div className={embedded ? "selected-job-card embedded" : "panel-section selected-job-card"}>
      <p className="panel-kicker">{t("岗位角色")}</p>
      <h3>{job.label}</h3>
      <p className="muted">{t("所属大类：")}{t(category?.label || "其他")}</p>
      <RoleSummary job={job} />
      <RoleDetails job={job} compact {...detailState} />
    </div>
  );
}

function RoleSummary({ job }) {
  const { t } = useI18n();
  return (
    <div className="role-summary">
      <span>{t("{count} 个招聘发布", { count: job.postingCount })}</span>
    </div>
  );
}

function useRoleDetails(job) {
  const [state, setState] = useState({ details: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ details: null, loading: true, error: null });
    loadRoleDetails(job.source, job.roleId)
      .then((details) => {
        if (!cancelled) setState({ details, loading: false, error: details ? null : "missing" });
      })
      .catch((error) => {
        if (!cancelled) setState({ details: null, loading: false, error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [job.source, job.roleId]);

  return state;
}

function RoleDetails({ job, details, loading, error, compact = false }) {
  const { t } = useI18n();
  const className = compact ? "role-details compact" : "panel-section role-details";
  if (loading) {
    return <div className={className}><p className="muted">{t("正在加载完整职位描述和招聘链接...")}</p></div>;
  }
  if (error || !details) {
    const message = error === "missing" ? t("未找到岗位详情") : error || t("未知错误");
    return <div className={className}><p className="muted">{t("岗位详情加载失败：{error}", { error: message })}</p></div>;
  }
  return (
    <div className={className}>
      <div className="job-detail-block">
        <h4>{t("职位描述")}</h4>
        <p>{details.description || t("暂无职位描述文本。")}</p>
      </div>
      <div className="job-detail-block">
        <h4>{t("职位要求")}</h4>
        <p>{details.requirement || t("暂无职位要求文本。")}</p>
      </div>
      <div className="job-detail-block">
        <h4>{t("招聘链接")}</h4>
        <div className="role-variants">
          {details.variants.map((variant, index) => (
            <a
              key={`${variant.job_id}:${index}`}
              href={variant.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackJobLink({ ...job, jobId: variant.job_id, url: variant.url })}
            >
              <strong>{variant.title}</strong>
              <small>{variant.display_job_id || variant.job_id}</small>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopSkillList({ title, skills }) {
  const { t } = useI18n();
  return (
    <div className="panel-section">
      <h3>{title}</h3>
      <div className="ranking">
        {skills.map((skill, index) => (
          <div key={skill.id} className="rank-row">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{t(skill.label)}</strong>
            <em>{skill.count}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function trackJobLink(job) {
  track("job_link_opened", {
    job_id: job.id,
    job_title: job.label,
    source: job.source,
  });
}

function LanguageRoot() {
  const [language, setLanguage] = useState(() => localStorage.getItem("goodjob_language") || "zh");

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    localStorage.setItem("goodjob_language", language);
  }, [language]);

  return (
    <I18nProvider language={language}>
      <App language={language} onLanguageChange={setLanguage} />
      <Analytics />
    </I18nProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <LanguageRoot />,
);
