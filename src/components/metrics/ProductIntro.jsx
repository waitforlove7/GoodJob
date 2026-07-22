import { Activity, BriefcaseBusiness, Building2, ChevronDown, ChevronUp, Layers3, Search } from "lucide-react";
import { useI18n } from "../../i18n.jsx";

export function ProductIntro({ graph, collapsed, onToggle }) {
  const { t } = useI18n();
  const metrics = [
    { icon: BriefcaseBusiness, label: t("招聘发布"), value: graph.stats.totalJobs },
    { icon: Building2, label: t("岗位角色"), value: graph.stats.roleCount ?? graph.jobs.length },
    { icon: Layers3, label: t("大类"), value: graph.categories.length },
    { icon: Activity, label: t("技能"), value: graph.skills.length },
    { icon: Search, label: t("描述完整度"), value: `${graph.stats.completeRate}%` },
  ];

  return (
    <section className={`hero-panel${collapsed ? " is-collapsed" : ""}`} id="top">
      <div className="title-block">
        <h1>{t("看见岗位之间的")} <span>{t("隐形连接")}</span></h1>
        <p>{t("把分散的职位描述变成一张可探索的技能星图。快速比较岗位大类、技能热度与职业方向，找到下一步最值得投入的能力。")}</p>
      </div>
      <div className="metric-grid" aria-label={t("数据概览")}>
        {metrics.map(({ icon: Icon, label, value }) => (
          <div className="metric" key={label}>
            <span className="metric-icon" aria-hidden="true"><Icon size={16} /></span>
            <span className="metric-value">{value}</span>
            <span className="metric-label">{label}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="intro-toggle"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        <span>{collapsed ? t("展开介绍") : t("收起介绍")}</span>
      </button>
    </section>
  );
}
