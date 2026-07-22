import { CircleHelp, Sparkles, User } from "lucide-react";
import { useI18n } from "../../i18n.jsx";

export function SiteHeader({ language, onLanguageChange, onProfileOpen, skipTarget = "#explore", children }) {
  const { t } = useI18n();

  return (
    <header className="site-header">
      <a className="skip-link" href={skipTarget}>{t("跳到主要内容")}</a>
      <a className="brand" href="#top" aria-label={`GoodJob ${t("首页")}`}>
        <span className="brand-mark" aria-hidden="true"><Sparkles size={16} /></span>
        <span className="brand-copy">
          <strong>GoodJob</strong>
          <small>{t("职业数据探索平台")}</small>
        </span>
      </a>

      {children}

      <div className="header-actions">
        <details className="help-menu">
          <summary aria-label={t("帮助")}>
            <CircleHelp size={17} aria-hidden="true" />
            <span>{t("帮助")}</span>
          </summary>
          <div className="help-popover">
            <strong>{t("快速上手")}</strong>
            <p>{t("拖动旋转，滚轮缩放，点击节点查看详情。按住 Ctrl 或 Command 可组合选择技能。")}</p>
          </div>
        </details>
        <button
          className="profile-header-btn"
          type="button"
          onClick={onProfileOpen}
          aria-label={t("个人主页")}
        >
          <User size={17} aria-hidden="true" />
          <span>{t("个人")}</span>
        </button>
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>
    </header>
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
        {language === "en" ? "ZH" : "中文"}
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
