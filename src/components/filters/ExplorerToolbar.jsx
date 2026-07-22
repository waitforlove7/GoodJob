import { Building2, Network, RotateCcw, Waypoints } from "lucide-react";
import { COMPANY_CONFIGS, COMPANY_KEYS } from "../../adapters/index.js";
import { useI18n } from "../../i18n.jsx";

export function ExplorerToolbar({
  companyKey,
  onCompanyChange,
  disabled = false,
  layerView,
  onLayerViewChange,
  skillViewMode,
  onSkillViewModeChange,
  selectionLabel,
  onReset,
}) {
  const { t } = useI18n();
  return (
    <div className="data-toolbar" aria-label={t("数据控制")}>
      <div className="toolbar-company-group">
        <span className="toolbar-label">{t("招聘数据源")}</span>
        <div className="company-selector" role="tablist" aria-label={t("选择公司")}>
          <button
            type="button"
            role="tab"
            aria-selected={companyKey === "all"}
            className={companyKey === "all" ? "active" : ""}
            disabled={disabled}
            onClick={() => onCompanyChange("all")}
          >
            <Building2 size={14} aria-hidden="true" />
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
              onClick={() => onCompanyChange(key)}
            >
              {t(COMPANY_CONFIGS[key].LABEL)}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-view-group">
        <span className="toolbar-label">{t("当前视图")}</span>
        <div className="layer-legend" role="group" aria-label={t("图谱视图")}>
          <button type="button" aria-pressed={layerView === "category"} onClick={() => onLayerViewChange("category")}>
            <Network size={14} aria-hidden="true" />{t("大类")}
          </button>
          <button type="button" aria-pressed={layerView === "skill"} onClick={() => onLayerViewChange("skill")}>
            <Waypoints size={14} aria-hidden="true" />{t("技能")}
          </button>
        </div>
        {layerView === "skill" ? (
          <div className="skill-view-toggle" role="group" aria-label={t("技能视图模式")}>
            <button type="button" aria-pressed={skillViewMode === "frequency"} onClick={() => onSkillViewModeChange("frequency")}>
              {t("频次分布")}
            </button>
            <button type="button" aria-pressed={skillViewMode === "dag"} onClick={() => onSkillViewModeChange("dag")}>
              {t("加点 DAG")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="toolbar-status" aria-live="polite">
        <span>{t("筛选状态")}</span>
        <strong>{selectionLabel || t("全局概览")}</strong>
      </div>
      <button className="toolbar-reset" type="button" onClick={onReset}>
        <RotateCcw size={15} aria-hidden="true" />
        {t("重置视图")}
      </button>
    </div>
  );
}
