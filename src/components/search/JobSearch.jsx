import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchJobs } from "../../jobGraph.js";
import { useI18n } from "../../i18n.jsx";

const PAGE_SIZE = 12;

export function JobSearch({ graph = null, onSelect, disabled = false }) {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resultLimit, setResultLimit] = useState(PAGE_SIZE);
  const [activeIndex, setActiveIndex] = useState(-1);
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

  useEffect(() => {
    setActiveIndex(visibleResults.length ? 0 : -1);
  }, [query, visibleResults.length]);

  const selectJob = (job) => {
    onSelect?.({ id: job.id, type: "job" });
    setOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = visibleResults[Math.max(0, activeIndex)];
    if (result) selectJob(result);
  };

  return (
    <div className="header-search" ref={rootRef}>
      <form role="search" onSubmit={handleSubmit}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          autoComplete="off"
          value={query}
          disabled={disabled}
          placeholder={disabled ? t("正在准备岗位搜索...") : t("搜索岗位、技能、类别或公司")}
          aria-label={t("搜索岗位")}
          aria-autocomplete="list"
          aria-expanded={open && Boolean(query.trim())}
          aria-controls="job-search-results"
          aria-activedescendant={activeIndex >= 0 ? `job-search-option-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setResultLimit(PAGE_SIZE);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && visibleResults.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => (current + 1) % visibleResults.length);
            } else if (event.key === "ArrowUp" && visibleResults.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => (current - 1 + visibleResults.length) % visibleResults.length);
            } else if (event.key === "Escape") {
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
              setResultLimit(PAGE_SIZE);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </form>
      {open && query.trim() ? (
        <div className="search-results" id="job-search-results" role="listbox">
          {results.length > 0 ? (
            <>
              <div className="search-results-count" aria-live="polite">
                {t("显示最相关的 {count} 个岗位角色", { count: visibleResults.length })}
              </div>
              {visibleResults.map((job, index) => {
                const category = graph.nodeById.get(job.categoryId);
                return (
                  <button
                    id={`job-search-option-${index}`}
                    key={job.id}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={activeIndex === index ? "is-active" : ""}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectJob(job)}
                  >
                    <strong>{job.label}</strong>
                    <span>
                      {t(job.sourceLabel)} / {t(category?.label || "其他")} / {t("{count} 个招聘发布", { count: job.postingCount })}
                    </span>
                  </button>
                );
              })}
              {hasMoreResults ? (
                <button
                  className="search-more"
                  type="button"
                  onClick={() => setResultLimit((current) => current + PAGE_SIZE)}
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
