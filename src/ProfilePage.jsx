import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "./i18n.jsx";
import { extractSkills, jobsMatchingAllSkills, scoreJobsBySkills, searchJobs } from "./jobGraph.js";
import { loadProfile, saveProfile } from "./profileStore.js";
import { BriefcaseBusiness, Building2, Sparkles, Upload, FileText, Search, CheckCircle, Target, BookOpen, TrendingUp, Zap } from "lucide-react";

const TARGET_SEARCH_PAGE_SIZE = 8;

export function ProfilePage({ graph, profileTargets, profileMasteredSkillIds, onAddTarget, onRemoveTarget, onToggleProfileSkill }) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLimit, setSearchLimit] = useState(TARGET_SEARCH_PAGE_SIZE);
  const searchRef = useRef(null);
  const [activeTargetIdx, setActiveTargetIdx] = useState(0);

  const [resumeText, setResumeText] = useState(() => loadProfile().resumeText);
  const [resumeKeywords, setResumeKeywords] = useState(() => loadProfile().resumeKeywords);
  const [matchShowCount, setMatchShowCount] = useState(15);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { saveProfile({ targets: profileTargets, profileMasteredSkillIds, resumeText, resumeKeywords }); }, [profileTargets, profileMasteredSkillIds, resumeText, resumeKeywords]);

  useEffect(() => {
    const handleClick = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, []);

  const activeTarget = profileTargets[activeTargetIdx] || profileTargets[0] || null;

  const weightedSkills = useMemo(() => {
    if (!graph || !activeTarget) return [];
    const cat = graph.categories.find(c => c.key === activeTarget.categoryKey);
    if (!cat) return [];
    const jobs = graph.jobsByCategory.get(cat.id) || [];
    const total = jobs.length;
    if (total === 0) return [];
    const counts = new Map();
    for (const job of jobs) { for (const sid of job.skillIds) { counts.set(sid, (counts.get(sid) || 0) + 1); } }
    return [...counts.entries()].map(([sid, cnt]) => ({
      id: sid, label: graph.nodeById.get(sid)?.label || sid, count: cnt, weight: cnt / total
    })).sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label));
  }, [graph, activeTarget]);

  const topSkills = useMemo(() => weightedSkills.slice(0, 7), [weightedSkills]);

  const totalWeight = useMemo(() => topSkills.reduce((s, w) => s + w.weight, 0), [topSkills]);
  const masteredWeight = useMemo(() => topSkills.filter(w => profileMasteredSkillIds.includes(w.id)).reduce((s, w) => s + w.weight, 0), [topSkills, profileMasteredSkillIds]);
  const progress = totalWeight > 0 ? masteredWeight / totalWeight : 0;

  const targetProgressMap = useMemo(() => {
    const map = {};
    for (const t of profileTargets) {
      const cat = graph?.categories?.find(c => c.key === t.categoryKey);
      if (!cat) { map[t.jobId] = 0; continue; }
      const jobs = graph.jobsByCategory.get(cat.id) || [];
      if (jobs.length === 0) { map[t.jobId] = 0; continue; }
      const counts = new Map();
      for (const job of jobs) { for (const sid of job.skillIds) { counts.set(sid, (counts.get(sid) || 0) + 1); } }
      const skills = [...counts.entries()]
        .map(([sid, cnt]) => ({ id: sid, weight: cnt / jobs.length }))
        .sort((a, b) => b.weight - a.weight || (a.label || "").localeCompare(b.label || ""))
        .slice(0, 7);
      const tw = skills.reduce((s, w) => s + w.weight, 0);
      const mw = skills.filter(w => profileMasteredSkillIds.includes(w.id)).reduce((s, w) => s + w.weight, 0);
      map[t.jobId] = tw > 0 ? mw / tw : 0;
    }
    return map;
  }, [graph, profileTargets, profileMasteredSkillIds]);

  const overallProgress = useMemo(() => {
    if (profileTargets.length === 0) return 0;
    const pcts = profileTargets.map(t => targetProgressMap[t.jobId] || 0);
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
  }, [profileTargets, targetProgressMap]);

  const totalMastered = useMemo(() => {
    if (!graph || profileTargets.length === 0) return 0;
    const allTargetSkillIds = new Set();
    for (const t of profileTargets) {
      const cat = graph.categories.find(c => c.key === t.categoryKey);
      if (!cat) continue;
      const jobs = graph.jobsByCategory.get(cat.id) || [];
      const counts = new Map();
      for (const job of jobs) { for (const sid of job.skillIds) { counts.set(sid, (counts.get(sid) || 0) + 1); } }
      const skills = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
      for (const [sid] of skills) allTargetSkillIds.add(sid);
    }
    return [...allTargetSkillIds].filter(id => profileMasteredSkillIds.includes(id)).length;
  }, [graph, profileTargets, profileMasteredSkillIds]);

  const totalSkills = useMemo(() => {
    if (!graph || profileTargets.length === 0) return 0;
    const allTargetSkillIds = new Set();
    for (const t of profileTargets) {
      const cat = graph.categories.find(c => c.key === t.categoryKey);
      if (!cat) continue;
      const jobs = graph.jobsByCategory.get(cat.id) || [];
      const counts = new Map();
      for (const job of jobs) { for (const sid of job.skillIds) { counts.set(sid, (counts.get(sid) || 0) + 1); } }
      const skills = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
      for (const [sid] of skills) allTargetSkillIds.add(sid);
    }
    return allTargetSkillIds.size;
  }, [graph, profileTargets]);

  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim() && graph) {
      setSearchLimit(TARGET_SEARCH_PAGE_SIZE);
      setSearchResults(searchJobs(graph, q, TARGET_SEARCH_PAGE_SIZE + 1));
      setSearchOpen(true);
    }
    else { setSearchResults([]); setSearchOpen(false); }
  };

  const handleShowMoreSearchResults = () => {
    const nextLimit = searchLimit + TARGET_SEARCH_PAGE_SIZE;
    setSearchLimit(nextLimit);
    setSearchResults(searchJobs(graph, searchQuery, nextLimit + 1));
  };

  const handleSelectJob = (job) => {
    if (profileTargets.length >= 5) return;
    if (profileTargets.some(t => t.jobId === job.id)) return;
    onAddTarget({ jobId: job.id, jobLabel: job.label, categoryKey: job.categoryKey, sourceLabel: job.sourceLabel });
    setSearchQuery(""); setSearchResults([]); setSearchOpen(false);
  };

    const matchedJobs = useMemo(() => {
    if (!graph || resumeKeywords.length === 0) return [];
    const skillIds = resumeKeywords
      .map(kw => graph.skills.find(s => s.label === kw)?.id)
      .filter(Boolean);
    if (skillIds.length === 0) return [];
    return scoreJobsBySkills(graph, skillIds, 0.10);
  }, [graph, resumeKeywords]);

  const handleFileDrop = useCallback((files) => {
    const file = files?.[0];
    if (!file) return;
    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => { setResumeText(e.target.result); };
      reader.readAsText(file);
    } else { alert(t("目前仅支持 .txt 格式的简历文件。")); }
  }, []);

  const handleAnalyzeResume = () => {
    if (!resumeText.trim()) return;
    setExtracting(true);
    setMatchShowCount(15);
    setTimeout(() => { const kws = extractSkills(resumeText); setResumeKeywords(kws); setExtracting(false); }, 100);
  };

  const pct = overallProgress;

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <div>
          <h1>{t("个人主页")}</h1>
          <p className="muted">{t("设定职业目标，跟踪技能进度，上传简历匹配岗位")}</p>
        </div>
      </div>

      <div className="profile-main">
        <div className="p-left-col">
        <section className="p-targets">

          <div className="p-targets-header">
            <Target size={18} /><h2>{t("岗位目标")}</h2>
            <small>{t("最多 5 个")}</small>
          </div>
          {profileTargets.length > 0 && (
            <div className="p-targets-summary">
              <div className="p-targets-summary-items">
                <div className="profile-summary-item">
                  <span className="profile-summary-icon"><TrendingUp size={16} /></span>
                  <div>
                    <strong>{Math.round(pct * 100)}%</strong>
                    <small>{t("整体进度")}</small>
                  </div>
                </div>
                <div className="profile-summary-item">
                  <span className="profile-summary-icon"><Zap size={16} /></span>
                  <div>
                    <strong>{totalMastered}/{totalSkills}</strong>
                    <small>{t("已掌握技能")}</small>
                  </div>
                </div>
                <div className="profile-summary-item">
                  <span className="profile-summary-icon"><Target size={16} /></span>
                  <div>
                    <strong>{profileTargets.length}</strong>
                    <small>{t("岗位目标")}</small>
                  </div>
                </div>
              </div>
              <span className="p-target-bar" style={{flex: 1, minWidth: 80, height: 6}}><i style={{ width: (pct * 100) + "%" }} /></span>
            </div>
          )}
          <div className="p-search-wrapper" ref={searchRef}>
            <div className={"p-search-row" + (searchQuery ? " has-query" : "")}>
              <div className="p-search-placeholder" aria-hidden="true">
                <Search size={14} />
                <span>{t("搜索并添加目标岗位...")}</span>
              </div>
              <input type="text" value={searchQuery} onChange={handleSearchInput} onFocus={() => searchQuery.trim() && setSearchOpen(true)} aria-label={t("搜索并添加目标岗位...")} />
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="p-search-dropdown">
                {searchResults.slice(0, searchLimit).map(job => (
                  <button key={job.id} type="button" className="p-search-item" onClick={() => handleSelectJob(job)}>
                    <strong>{job.label}</strong>
                    <span>{job.sourceLabel}</span>
                  </button>
                ))}
                {searchResults.length > searchLimit && (
                  <button type="button" className="p-search-more" onClick={handleShowMoreSearchResults}>
                    {t("显示更多")}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="p-target-cards">
            {profileTargets.map((t, idx) => {
              const pct2 = targetProgressMap[t.jobId] || 0;
              const isActive = idx === activeTargetIdx;
              return (
                <button key={t.jobId} type="button" className={"p-target-card" + (isActive ? " is-active" : "")} onClick={() => setActiveTargetIdx(idx)}>
                  <div className="p-target-card-top">
                    <strong>{t.jobLabel}</strong>
                    <small>{Math.round(pct2 * 100)}%</small>
                  </div>
                  <span className="p-target-bar"><i style={{ width: (pct2 * 100) + "%" }} /></span>
                  <button type="button" className="p-target-remove" onClick={(e) => { e.stopPropagation(); onRemoveTarget(idx); }}>&times;</button>
                </button>
              );
            })}
            {profileTargets.length === 0 && (
              <div className="p-empty-state">
                <Target size={32} />
                <p>{t("请从上方搜索并添加目标岗位")}</p>
              </div>
            )}
          </div>
        </section>

        {activeTarget && (
          <section className="p-skills">
            <div className="p-skills-header">
              <BookOpen size={18} /><h2>{t("所需技能")} <small>{activeTarget.jobLabel}</small></h2>
              <div className="p-skills-progress">
                <span className="p-skills-pct">{Math.round(progress * 100)}%</span>
                <span className="p-target-bar"><i style={{ width: (progress * 100) + "%" }} /></span>
                <small>{profileMasteredSkillIds.filter(id => topSkills.some(w => w.id === id)).length}/{topSkills.length}</small>
              </div>
            </div>
            <div className="p-skills-list">
              {topSkills.map(skill => {
                const mastered = profileMasteredSkillIds.includes(skill.id);
                return (
                  <div key={skill.id} className={"p-skill-row" + (mastered ? " is-mastered" : "")} onClick={() => onToggleProfileSkill(skill.id)} role="button" tabIndex="0" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleProfileSkill(skill.id); } }}>
                    <span className="p-skill-check">{mastered ? <CheckCircle size={16} /> : <span className="p-skill-circle" />}</span>
                    <strong>{skill.label}</strong>
                    <span className="p-skill-bar-track"><span className="p-skill-bar-fill" style={{ width: (skill.weight * 100) + "%" }} /></span>
                    <small><small>{skill.count}</small></small>
                  </div>
                );
              })}
              {topSkills.length === 0 && (
                <div className="p-empty-state">
                  <BookOpen size={28} />
                  <p>{t("暂无技能数据")}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      <div className="p-right-col">
        <section className="p-resume">
          <div className="p-resume-header">
            <FileText size={18} /><h2>{t("简历解析")}</h2>
          </div>
          <div className="p-resume-body">
            <div className={"p-dropzone" + (dragOver ? " is-dragover" : "")}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              role="button" tabIndex="0" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}>
              <Upload size={20} /><strong>{t("上传简历")}</strong>
              <small>{t("支持 .txt 格式，或粘贴到下方文本框")}</small>
              <input ref={fileInputRef} type="file" accept=".txt" hidden onChange={e => handleFileDrop(e.target.files)} />
            </div>
            <textarea className="p-resume-textarea" rows={5} value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder={t("或将简历文本粘贴到这里...")} />
            <button type="button" className="p-resume-btn" onClick={handleAnalyzeResume} disabled={!resumeText.trim() || extracting}>
              <Sparkles size={14} />{extracting ? t("解析中...") : t("提取关键词")}
            </button>
            {resumeKeywords.length > 0 && (
              <div className="p-keywords">
                <h4>{t("提取的技能关键词")} <small>({resumeKeywords.length})</small></h4>
                <div className="tag-list">{resumeKeywords.map(kw => {
                  const skill = graph?.skills?.find(s => s.label === kw);
                  return <span key={kw} className={"tag" + (skill && profileMasteredSkillIds.includes(skill.id) ? " is-mastered" : "")}>{kw}{skill && profileMasteredSkillIds.includes(skill.id) && <CheckCircle size={12} />}</span>;
                })}</div>
              </div>
            )}
            {matchedJobs.length > 0 && (
              <div className="p-matches">
                <h4>{t("岗位匹配")} <small>({matchedJobs.length})</small></h4>
                {matchedJobs.slice(0, matchShowCount).map(({ job, score, matchedCount, totalResumeSkills }) => {
                  const cat = graph?.nodeById?.get(job.categoryId);
                  const pct = Math.round(score * 100);
                  return (
                    <div key={job.id} className="p-match-item">
                      <div className="p-match-header"><strong>{job.label}</strong><span className="p-match-num">{pct}%</span></div>
                      <div className="p-match-meta"><span>{cat ? t(cat.label) : ""}</span><span>{t(job.sourceLabel)}</span><span>{matchedCount}/{totalResumeSkills} {t("项技能匹配")}</span></div>
                    </div>
                  );
                })}

                {matchedJobs.length > matchShowCount && (
                  <button type="button" className="p-matches-more" onClick={() => setMatchShowCount(prev => prev + 15)}>
                    {t("显示更多")}（{matchedJobs.length - matchShowCount}）
                  </button>
                )}
                {matchShowCount > 15 && matchedJobs.length > 15 && (
                  <button type="button" className="p-matches-collapse" onClick={() => setMatchShowCount(15)}>
                    {t("收起")}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}



