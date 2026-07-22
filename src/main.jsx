import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Analytics, track } from "@vercel/analytics/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Compass,
  Home,
  Layers3,
  Menu,
  Network,
  Route as RouteIcon,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { buildJobGraph, jobsMatchingAllSkills, searchJobs, sortRelatedJobs } from "./jobGraph.js";
import { JobGalaxy } from "./JobGalaxy.jsx";
import { SkillDag, SkillDagPanel } from "./SkillDag.jsx";
import { ProfilePage } from "./ProfilePage.jsx";
import { DistributionChart } from "./DistributionChart.jsx";
import { loadProfile, saveProfile } from "./profileStore.js";
import "./styles.css";
import "./experience.css";
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
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [companyKey, setCompanyKey] = useState("all");
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [layerView, setLayerView] = useState("category");
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [masteredSkillIds, setMasteredSkillIds] = useState([]);
  const [relatedJobId, setRelatedJobId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileTargets, setProfileTargets] = useState(() => loadProfile().targets);
  const [profileMasteredSkillIds, setProfileMasteredSkillIds] = useState(
    () => loadProfile().profileMasteredSkillIds,
  );
  const graphCache = useRef(new Map());
  const copy = useCallback((zh, en) => language === "en" ? en : zh, [language]);

  useEffect(() => {
    const current = loadProfile();
    saveProfile({ ...current, targets: profileTargets, profileMasteredSkillIds });
  }, [profileTargets, profileMasteredSkillIds]);

  const handleCompanyChange = useCallback((nextCompanyKey) => setCompanyKey(nextCompanyKey), []);

  useEffect(() => {
    const cached = graphCache.current.get(companyKey);
    if (cached) {
      setGraph(cached);
      setLoading(false);
      setLoadError(null);
      setSelected(null);
      setSelectedSkillIds([]);
      setMasteredSkillIds([]);
      setRelatedJobId(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSelected(null);
    setSelectedSkillIds([]);
    setMasteredSkillIds([]);
    setRelatedJobId(null);

    (async () => {
      try {
        const payload = companyKey === "all"
          ? await loadMergedData(COMPANY_KEYS)
          : await loadCompanyData(companyKey);
        const keys = companyKey === "all" ? COMPANY_KEYS : [companyKey];
        const nextGraph = buildJobGraph(payload, {
          source: payload.source,
          categoryOverrides: buildMergedOverrides(keys),
        });
        if (!cancelled) {
          graphCache.current.set(companyKey, nextGraph);
          setGraph(nextGraph);
        }
      } catch (error) {
        console.error("[GoodJob] Failed to load company data:", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
          setGraph(createEmptyGraph());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyKey]);

  const handleSelect = useCallback((nextSelection) => {
    setRelatedJobId(null);
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
    const isSelected = selectedSkillIds.includes(nextSelection.id);
    const nextSkillIds = isSelected
      ? selectedSkillIds.filter((skillId) => skillId !== nextSelection.id)
      : [...selectedSkillIds, nextSelection.id];
    setSelectedSkillIds(nextSkillIds);
    if (nextSkillIds.length === 0) setSelected(null);
    else if (!isSelected || selected?.id === nextSelection.id) {
      setSelected({ id: isSelected ? nextSkillIds.at(-1) : nextSelection.id, type: "skill" });
    }
  }, [handleSelect, selected, selectedSkillIds]);

  const selectedNode = selected ? graph?.nodeById?.get(selected.id) : null;
  const galaxySelection = relatedJobId ? { id: relatedJobId, type: "job" } : selected;
  const selectedCategory = selectedNode?.type === "category"
    ? selectedNode
    : selectedNode?.type === "job"
      ? graph?.nodeById?.get(selectedNode.categoryId)
      : null;

  const handleLayerViewChange = useCallback((nextView) => {
    if (nextView === layerView) {
      if (nextView === "skill") handleSelect(null);
      return;
    }
    handleSelect(null);
    setLayerView(nextView);
  }, [handleSelect, layerView]);

  const handleAddTarget = useCallback((target) => setProfileTargets((current) => [...current, target]), []);
  const handleRemoveTarget = useCallback((index) => setProfileTargets((current) => current.filter((_, i) => i !== index)), []);
  const handleToggleProfileSkill = useCallback((skillId) => {
    setProfileMasteredSkillIds((current) => current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId]);
  }, []);
  const handleToggleMasteredSkill = useCallback((skillId) => {
    setMasteredSkillIds((current) => current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId]);
  }, []);

    const pageHeader = (chapter, title, { search = false } = {}) => (
    <ExhibitionHeader
      chapter={chapter}
      title={title}
      language={language}
      onLanguageChange={onLanguageChange}
      onMenuOpen={() => setMenuOpen(true)}
    >
      {search ? <JobSearch graph={graph} onSelect={handleSelect} disabled={loading || !graph} /> : null}
    </ExhibitionHeader>
  );

  const explorerPage = () => (
    <main className="app-shell exhibition-app">
      {pageHeader(
        copy("岗位宇宙", "Job Galaxy"),
        copy("在真实招聘数据中定位职业坐标", "Locate a career coordinate in real hiring data"),
        { search: true },
      )}
      <section className={`workspace exhibition-workspace${loading ? " is-loading" : ""}`} id="main-content" aria-busy={loading}>
        <div className="visualization-column">
          <CompanyToolbar companyKey={companyKey} onChange={handleCompanyChange} disabled={loading} />
          <div className="scene-wrap exhibition-scene">
          <div className="galaxy-toolbar">
            <ViewToggle activeView={layerView} onChange={handleLayerViewChange} />
            {graph ? (
              <div className="galaxy-stats">
                <strong>{graph.jobs.length}</strong><span> {t("岗位")}</span>
                <span className="stats-sep">·</span>
                <strong>{graph.skills.length}</strong><span> {t("技能")}</span>
              </div>
            ) : null}
          </div>
            {!graph ? <DataLoadingState copy={copy} /> : (
              <JobGalaxy
                graph={graph}
                selected={galaxySelection}
                selectedSkillIds={selectedSkillIds}
                onSelect={handleSelect}
                layerView={layerView}
                skillCategoryFilterId={null}
              />
            )}
            {loading && graph ? (
              <div className="scene-loading-overlay" role="status" aria-live="polite">
                <div className="loading-spinner" />
                <strong>{t("正在切换数据源...")}</strong>
                <span>{t("当前布局保持不变，新图谱准备完成后将自动更新。")}</span>
              </div>
            ) : null}
          </div>
        </div>
        {!graph ? (
          <aside className="info-panel"><DataLoadingState copy={copy} compact /></aside>
        ) : (
          <InfoPanel
            graph={graph}
            selectedNode={selectedNode}
            selectedCategory={selectedCategory}
            layerView={layerView}
            skillCategoryFilterId={null}
            selectedSkillIds={selectedSkillIds}
            selectedRelatedJobId={relatedJobId}
            onSkillCategoryFilterChange={(categoryId) => {
              setRelatedJobId(null);
            }}
            onCategorySelect={(categoryId) => handleSelect(categoryId ? { id: categoryId, type: "category" } : null)}
            onRelatedJobSelect={(jobId) => setRelatedJobId((current) => current === jobId ? null : jobId)}
            onSkillSelect={handleSkillSelect}
          />
        )}
      </section>
    </main>
  );

  return (
    <div className="experience-root">
      <a className="skip-link experience-skip" href="#main-content">{copy("跳到主要内容", "Skip to main content")}</a>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="route-frame"
          initial={reduceMotion ? false : { opacity: 0, filter: "blur(8px)", scale: 0.995 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, filter: "blur(5px)", scale: 1.005 }}
          transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage graph={graph} loading={loading} language={language} onMenuOpen={() => setMenuOpen(true)} onLanguageChange={onLanguageChange} />} />
            <Route path="/galaxy" element={explorerPage()} />
            <Route path="/skilldag" element={<SkillDagPage graph={graph} pageHeader={(c, t) => pageHeader(c, t)} copy={copy} masteredSkillIds={masteredSkillIds} onToggleSkill={handleToggleMasteredSkill} />} />
            <Route path="/career" element={
              <main className="app-shell exhibition-app career-page-shell">
                {pageHeader(copy("个人主页", "Profile"), copy("设定职业目标，跟踪技能进度，上传简历匹配岗位", "Set career goals, track skill progress, upload resume to match jobs"))}
                <section id="main-content" className="career-workspace is-profile">
                  <ProfilePage graph={graph} profileTargets={profileTargets} profileMasteredSkillIds={profileMasteredSkillIds} onAddTarget={handleAddTarget} onRemoveTarget={handleRemoveTarget} onToggleProfileSkill={handleToggleProfileSkill} />
                </section>
              </main>
            } />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <ChapterMenu open={menuOpen} onClose={() => setMenuOpen(false)} language={language} />
      {loadError ? <div className="global-error" role="alert">{copy("数据加载失败：", "Data load failed: ")}{loadError}</div> : null}
      <div className="desktop-only-notice" role="status"><Compass size={28} /><strong>{copy("请使用桌面端访问", "Desktop display required")}</strong><span>{copy("GoodJob 当前针对 1200px 及以上屏幕设计。", "GoodJob is designed for screens 1200px and wider.")}</span></div>
    </div>
  );
}

function createEmptyGraph() {
  return {
    categories: [], jobs: [], skills: [], nodes: [], links: [],
    nodeById: new Map(), jobsByCategory: new Map(), jobsBySkill: new Map(),
    jobsBySkillAndCategory: new Map(), globalSkillRanking: [],
    skillRankingByCategory: new Map(), skillTripleRankingByCategory: new Map(),
    globalSkillVisuals: new Map(), skillVisualsByCategory: new Map(),
    stats: { totalJobs: 0, completeJobs: 0, completeRate: 0 },
  };
}



const CHAPTERS = [
  { path: "/", zh: "首页", en: "Home", icon: Home },
  { path: "/galaxy", zh: "岗位宇宙", en: "Job Galaxy", icon: Sparkles },
  { path: "/skilldag", zh: "技能加点", en: "Skill DAG", icon: Layers3 },
  { path: "/career", zh: "职业路径", en: "Career Path", icon: RouteIcon },
];

function ExhibitionHeader({ chapter, title, language, onLanguageChange, onMenuOpen, children }) {
  return (
    <header className="exhibition-header">
      <Link className="exhibition-brand" to="/" aria-label={language === "en" ? "GoodJob home" : "GoodJob 首页"}>
        <span className="brand-orbit" aria-hidden="true"><i /></span>
        <strong>GoodJob</strong>
      </Link>
      <div className="chapter-heading">
        <span>{chapter}</span>
        <strong>{title}</strong>
      </div>
      {children}
      <div className="exhibition-actions">
        <LanguageToggle language={language} onChange={onLanguageChange} />
        <button type="button" className="glass-icon-button menu-trigger" onClick={onMenuOpen} aria-label={language === "en" ? "Open chapter menu" : "打开章节菜单"}>
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}

function ChapterMenu({ open, onClose, language }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const focusable = () => [...dialog.querySelectorAll('a[href], button:not([disabled])')];
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="chapter-menu-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            ref={dialogRef}
            className="chapter-menu"
            role="dialog"
            aria-modal="true"
            aria-label={language === "en" ? "GoodJob chapters" : "GoodJob 章节目录"}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="chapter-menu-top">
              <span>{language === "en" ? "Exhibition index" : "展览目录"}</span>
              <button type="button" onClick={onClose} aria-label={language === "en" ? "Close menu" : "关闭菜单"}><X size={20} /></button>
            </div>
            <nav aria-label={language === "en" ? "Main chapters" : "主要章节"}>
              {CHAPTERS.map(({ path, zh, en, icon: Icon }) => (
                <NavLink key={path} to={path} end={path === "/"} onClick={onClose}>
                  {({ isActive }) => (
                    <>
                      <Icon size={18} aria-hidden="true" />
                      <span>{language === "en" ? en : zh}</span>
                      <i>{isActive ? (language === "en" ? "Current" : "当前") : ""}</i>
                      <ArrowRight size={18} aria-hidden="true" />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <p>{language === "en" ? "Follow real hiring data from uncertainty to an actionable career route." : "从职业迷茫出发，沿真实招聘数据抵达可执行的成长路径。"}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DataLoadingState({ copy, compact = false }) {
  return (
    <div className={`data-loading-state${compact ? " is-compact" : ""}`} role="status" aria-live="polite">
      <div className="loading-spinner" />
      <strong>{copy("正在读取真实招聘数据", "Loading real hiring data")}</strong>
      <span>{copy("岗位、技能与关系将在数据准备完成后出现。", "Jobs, skills, and relationships will appear when the data is ready.")}</span>
    </div>
  );
}



function HomePage({ graph, loading, language, onMenuOpen, onLanguageChange }) {
  const copy = (zh, en) => language === "en" ? en : zh;
  const labels = (graph?.jobs || []).slice(0, 9).map((job) => job.label);
  const topSkills = graph?.globalSkillRanking?.slice(0, 8) || [];
  const floatingJobs = (graph?.jobs || []).slice(0, 18);
  const companyCount = COMPANY_KEYS.length;
  const roleCount = graph?.stats?.roleCount ?? graph?.jobs?.length ?? 0;
  const skillCount = graph?.skills?.length ?? 0;
  return (
    <main className="home-cover" id="main-content">
      <div className="home-hero">
      <div className="star-dust" aria-hidden="true" />
      <div className="home-topbar">
        <Link className="home-brand" to="/"><strong>GoodJob</strong><span>CAREER DATA EXPLORATION</span></Link>
        <div className="home-top-actions">
          <LanguageToggle language={language} onChange={onLanguageChange} />
          <button type="button" className="glass-icon-button" onClick={onMenuOpen} aria-label={copy("打开章节菜单", "Open chapter menu")}><Menu size={19} /></button>
        </div>
      </div>
      <div className="career-orbit" aria-hidden="true">
        <i className="orbit orbit-a" /><i className="orbit orbit-b" /><i className="orbit orbit-c" /><i className="orbit orbit-d" />
        {labels.map((label, index) => <span key={`${label}:${index}`} style={{ "--node-index": index }}>{label}</span>)}
      </div>
      <section className="home-copy">
        <p>{copy("职业数据展览", "Career data exhibition")}</p>
        <h1>{copy("看见岗位之间\n隐藏的连接", "See the hidden\nconnections between jobs").split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
        <div className="home-intro">{copy("从真实招聘数据出发，探索岗位、技能与职业路径之间的关系。", "Explore the relationships among jobs, skills, and career paths through real hiring data.")}</div>
        <div className="home-cta-row">
          <Link className="primary-entry" to="/galaxy">{copy("进入岗位宇宙", "Enter the job galaxy")}<ArrowRight size={17} /></Link>
        </div>
      </section>
      <div className="home-data-status" role="status" aria-live="polite">
        <span>{loading ? copy("真实数据正在形成星图", "Real data is forming the galaxy") : copy("真实招聘数据已就绪", "Real hiring data ready")}</span>
        {graph ? <strong>{graph.stats.roleCount ?? graph.jobs.length} {copy("个岗位坐标", "job coordinates")}</strong> : null}
      </div>
      </div>

      <section className="journey-chapter chapter-confusion">
        <div className="floating-roles" aria-hidden="true">
          {floatingJobs.map((job, index) => (
            <span key={job.id} style={{
              "--role-top": `${4 + Math.floor(index / 2) * 10.8}%`,
              "--role-static-left": `${index % 2 === 0 ? 0 : 52}%`,
              "--role-shift-y": `${(Math.floor(index / 2) % 3 - 1) * 3}px`,
              "--role-opacity": 0.24 + (index % 4) * 0.085,
              "--role-size": `${12 + (index % 3) * 2}px`,
              "--role-blur": `${index % 5 === 0 ? 0.35 : 0}px`,
              "--role-duration": `${16 + (Math.floor(index / 2) % 4) * 2}s`,
              "--role-delay": `${-((index % 2) * (8 + (Math.floor(index / 2) % 4)) + Math.floor(index / 2) * 0.65)}s`,
            }}>{job.label}</span>
          ))}
        </div>
        <div className="journey-copy">
          <span>{copy("职业选择为何令人迷茫", "Why career choices feel unclear")}</span>
          <h2>{copy("招聘网站给了我们无数岗位，却很少解释它们之间的关系。", "Job boards show countless roles, but rarely explain how those roles connect.")}</h2>
        </div>
      </section>
      <section className="journey-chapter chapter-relations">
        <div className="relationship-diagram" role="img" aria-label={copy("数据关系：" + companyCount + " 家公司、" + roleCount + " 个岗位、" + skillCount + " 项技能", "Data relationship: " + companyCount + " companies, " + roleCount + " jobs, and " + skillCount + " skills")}>
          <div><Building2 aria-hidden="true" /><strong>{companyCount}</strong><span>{copy("公司", "Companies")}</span></div>
          <i aria-hidden="true" /><div><BriefcaseBusiness aria-hidden="true" /><strong>{roleCount}</strong><span>{copy("岗位", "Jobs")}</span></div>
          <i aria-hidden="true" /><div><Network aria-hidden="true" /><strong>{skillCount}</strong><span>{copy("技能", "Skills")}</span></div>
        </div>
        <div className="journey-copy">
          <span>{copy("岗位并不是孤立存在", "Jobs do not exist in isolation")}</span>
          <h2>{copy("每一个岗位，都是技能、行业与组织需求共同形成的坐标。", "Every role is a coordinate formed by skills, industries, and organizational needs.")}</h2>
        </div>
      </section>
      <section className="journey-chapter chapter-path">
        <div className="skill-ribbon" aria-label={copy("真实高频技能预览", "Preview of real high-frequency skills")}>
          {topSkills.map((skill) => <span key={skill.id}><b>{skill.label}</b><small>{skill.count}</small></span>)}
        </div>
        <div className="journey-copy">
          <span>{copy("从市场需求找到成长路径", "Turn market demand into a growth path")}</span>
          <h2>{copy("观察真实需求，补齐关键技能，再选择最接近你的职业方向。", "Read real demand, fill critical skill gaps, then choose the career direction closest to you.")}</h2>
          <Link className="primary-entry" to="/galaxy">{copy("进入岗位宇宙", "Enter the job galaxy")}<ArrowRight size={17} /></Link>
        </div>
      </section>
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
  const pageSize = 12;
  const { t } = useI18n();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resultLimit, setResultLimit] = useState(pageSize);
  const results = useMemo(
    () => (graph && query.trim() ? searchJobs(graph, query, resultLimit + 1) : []),
    [graph, query, resultLimit],
  );
  const visibleResults = results.slice(0, resultLimit);
  const hasMoreResults = results.length > resultLimit;

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
    if (visibleResults[0]) selectJob(visibleResults[0]);
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
            setResultLimit(pageSize);
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
              setResultLimit(pageSize);
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
              <div className="search-results-count">{t("显示最相关的 {count} 个岗位角色", { count: visibleResults.length })}</div>
              {visibleResults.map((job) => {
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
              {hasMoreResults ? (
                <button
                  className="search-more"
                  type="button"
                  onClick={() => setResultLimit((current) => current + pageSize)}
                >
                  {t("显示更多")}
                </button>
              ) : null}
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

function SkillDagPage({ graph, pageHeader, copy, masteredSkillIds, onToggleSkill }) {
  const { t } = useI18n();
  const [selectedDagCategoryId, setSelectedDagCategoryId] = useState(null);

  return (
    <main className="app-shell exhibition-app">
      {pageHeader(copy("技能加点", "Skill DAG"), copy("规划技能学习路径", "Plan your skill learning path"))}
      <section id="main-content" className="workspace exhibition-workspace">
        <div className="visualization-column" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
          <div className="scene-wrap exhibition-scene" style={{ overflow: "visible", height: "100%" }}>
            {graph ? (
              <SkillDag
                graph={graph}
                selectedSkillIds={masteredSkillIds}
                onToggleSkill={onToggleSkill}
                selectedCategoryId={selectedDagCategoryId}
                onSelectCategory={setSelectedDagCategoryId}
              />
            ) : <DataLoadingState copy={copy} />}
          </div>
        </div>
        {graph ? (
          <SkillDagPanel graph={graph} selectedSkillIds={masteredSkillIds} onToggleSkill={onToggleSkill} selectedCategoryId={selectedDagCategoryId} />
        ) : <aside className="info-panel"><DataLoadingState copy={copy} compact /></aside>}
      </section>
    </main>
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
            {t("共 {jobs} 个岗位角色，{skills} 项技能。", { jobs: graph.jobs.length, skills: graph.skills.length })}
          </p>
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
        <DistributionChart
          graph={graph}
          skillOverview
          selectedSkillIds={selectedSkillIds}
          onSkillSelect={onSkillSelect}
        />
      )}
      {(!skillOverview || pieSkill) && (
        <DistributionChart
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
  <BrowserRouter>
    <LanguageRoot />
  </BrowserRouter>,
);
