import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import "echarts-wordcloud";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "./i18n.jsx";

const CHART_TYPES = ["pie", "bar", "treemap", "wordcloud"];

const DATA_PALETTE = [
  "#39c6bc", "#4ea8de", "#8b7fe8", "#e58b52", "#5cbf82",
  "#e3b341", "#5e8fd6", "#c56b9a", "#46b6c4", "#ec755f",
  "#8ccf54", "#7b9ce1", "#d39a5b", "#3fc49d", "#a889e6",
];

const WORD_PALETTE = [
  "#62eee0", "#68bff2", "#a89af3", "#f0a06c", "#77d79d",
  "#f1c95d", "#7da6ef", "#e184b2", "#67d0db", "#f08c78",
];

function dataColor(index) {
  return DATA_PALETTE[index % DATA_PALETTE.length];
}

function formatPercent(value) {
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function buildRows({
  graph,
  skill,
  filteredJobs,
  skillOverview,
  isSkillDistribution,
  t,
}) {
  if (skillOverview) {
    const total = graph.globalSkillRanking.reduce((sum, item) => sum + item.count, 0) || 1;
    const topSkills = graph.globalSkillRanking.slice(0, 15);
    const otherCount = graph.globalSkillRanking.slice(15).reduce((sum, item) => sum + item.count, 0);
    return [
      ...topSkills.map((item, index) => ({
        id: item.id,
        label: t(item.label),
        name: t(item.label),
        color: dataColor(index),
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
    .map((category, index) => {
      const count = filteredJobs
        ? filteredJobs.filter((job) => job.categoryId === category.id).length
        : jobsByCategory?.get(category.id)?.length || 0;
      return {
        id: category.id,
        label: t(category.label),
        name: t(category.label),
        color: dataColor(index),
        count,
        value: count,
        percent: count / total,
        selectable: true,
      };
    })
    .filter((row) => isSkillDistribution || row.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildTooltipFormatter(mode, t) {
  return (params) => {
    const data = params?.data || params;
    const color = data.color || params?.color || "#62d9ce";
    const count = data.count ?? data.value ?? 0;
    const percent = data.percent ?? 0;
    const countLabel = mode === "skill-overview"
      ? t("{count} 次提及", { count })
      : `${t("{count} 个岗位", { count })}${mode === "skill" ? t("提及") : ""}`;
    const name = data.name || data.label || "";
    return `<div style="border-left:3px solid ${color};padding-left:9px;margin:-2px 0">
      <strong style="color:#e8ece8">${name}</strong><br/>
      <span style="color:#a9bcba">${countLabel} · ${formatPercent(percent)}</span>
    </div>`;
  };
}

function buildChartOption({ chartType, rows, mode, activeId, selectedSkillIds, t }) {
  const textColor = "#dce9e7";
  const mutedColor = "#7f9898";
  const chartBackground = "#07151d";
  const tooltip = {
    trigger: "item",
    backgroundColor: "rgba(5,13,19,0.96)",
    borderWidth: 1,
    borderColor: "rgba(98,217,206,0.32)",
    textStyle: { color: textColor },
    extraCssText: "box-shadow:0 18px 42px rgba(0,0,0,.34);border-radius:8px;",
    formatter: buildTooltipFormatter(mode, t),
  };

  const selectedSet = new Set(selectedSkillIds || []);

  if (chartType === "pie") {
    return {
      color: rows.map((row) => row.color),
      tooltip,
      series: [
        {
          type: "pie",
          radius: ["28%", "58%"],
          center: ["50%", "52%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: "rgba(218, 255, 250, 0.32)",
            borderWidth: 1,
          },
          label: {
            formatter: (params) => `${params.name}\n${formatPercent(params.data.percent)}`,
            fontSize: 12,
            fontWeight: 600,
          },
          labelLine: {
            length: 12,
            length2: 8,
          },
          data: rows.map((row) => ({
            ...row,
            name: row.label,
            value: row.value,
            label: {
              color: row.color,
            },
            labelLine: {
              lineStyle: { color: row.color },
            },
            itemStyle: {
              color: row.color,
              opacity: mode === "skill-overview"
                ? selectedSet.size === 0 || selectedSet.has(row.id) ? 1 : 0.35
                : activeId && activeId !== row.id ? 0.4 : 1,
              borderColor: (mode === "skill-overview" ? selectedSet.has(row.id) : activeId === row.id)
                ? "#8aeee5"
                : "rgba(218, 255, 250, 0.32)",
              borderWidth: (mode === "skill-overview" ? selectedSet.has(row.id) : activeId === row.id) ? 2 : 1,
            },
          })),
        },
      ],
    };
  }

  if (chartType === "bar") {
    const barRows = [...rows].reverse();
    return {
      tooltip,
      grid: { left: 12, right: 28, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        axisLabel: { color: mutedColor, fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(98,217,206,0.1)" } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "category",
        data: barRows.map((row) => row.label),
        axisLabel: {
          color: (value, index) => barRows[index]?.color || textColor,
          fontSize: 11,
          width: 88,
          overflow: "truncate",
        },
        axisLine: { lineStyle: { color: "rgba(98,217,206,0.2)" } },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: barRows.map((row) => ({
            ...row,
            name: row.label,
            itemStyle: {
              color: row.color,
              borderRadius: [0, 6, 6, 0],
              opacity: mode === "skill-overview"
                ? selectedSet.size === 0 || selectedSet.has(row.id) ? 1 : 0.35
                : activeId && activeId !== row.id ? 0.4 : 1,
            },
            label: {
              color: row.color,
            },
          })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: "right",
            fontSize: 10,
            formatter: (params) => formatPercent(params.data.percent),
          },
        },
      ],
    };
  }

  if (chartType === "treemap") {
    return {
      tooltip,
      series: [
        {
          type: "treemap",
          width: "94%",
          height: "90%",
          top: "5%",
          left: "3%",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: "{b}",
            fontFamily: '"Segoe UI Variable Text", "Microsoft YaHei UI", "PingFang SC", sans-serif',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 18,
          },
          upperLabel: { show: false },
          itemStyle: {
            borderColor: "rgba(218, 255, 250, 0.28)",
            borderWidth: 1,
            gapWidth: 1,
          },
          data: rows.map((row) => ({
            ...row,
            name: row.label,
            value: row.value,
            label: {
              color: "#f1fffd",
              backgroundColor: "transparent",
              padding: [3, 4],
              textBorderColor: "rgba(3, 12, 18, 0.72)",
              textBorderWidth: 1,
            },
            itemStyle: {
              color: row.color,
              opacity: mode === "skill-overview"
                ? selectedSet.size === 0 || selectedSet.has(row.id) ? 1 : 0.4
                : activeId && activeId !== row.id ? 0.45 : 1,
            },
          })),
        },
      ],
    };
  }

  // wordcloud — inspired by ECharts wordCloud examples
  return {
    tooltip,
    series: [
      {
        type: "wordCloud",
        shape: "circle",
        left: "center",
        top: "center",
        width: "98%",
        height: "98%",
        sizeRange: [17, 58],
        rotationRange: [0, 0],
        rotationStep: 0,
        gridSize: 8,
        drawOutOfBound: false,
        textStyle: {
          fontFamily: '"Aptos", "Segoe UI Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontWeight: 620,
          color: "#62d9ce",
        },
        emphasis: {
          focus: "self",
          textStyle: {
            textShadowBlur: 10,
            textShadowColor: "rgba(98,217,206,0.28)",
          },
        },
        data: rows
          .filter((row) => row.value > 0)
          .map((row, index) => ({
            ...row,
            name: row.label,
            value: row.value,
            textStyle: {
              color: WORD_PALETTE[index % WORD_PALETTE.length],
            },
          })),
      },
    ],
  };
}

const CHART_TYPE_LABELS = {
  pie: "饼图",
  bar: "条形图",
  treemap: "矩形树图",
  wordcloud: "词云图",
};

export const DistributionChart = React.memo(function DistributionChart({
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
  const reduceMotion = useReducedMotion();
  const chartRef = useRef(null);
  const instanceRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const [chartTypeIndex, setChartTypeIndex] = useState(0);
  const chartType = CHART_TYPES[chartTypeIndex];
  const isSkillDistribution = Boolean(skill || filteredJobs);
  const mode = skillOverview ? "skill-overview" : isSkillDistribution ? "skill" : "jobs";

  const rows = useMemo(
    () => buildRows({ graph, skill, filteredJobs, skillOverview, isSkillDistribution, t }),
    [filteredJobs, graph, isSkillDistribution, skill, skillOverview, t],
  );

  const title = skillOverview
    ? t("技能频次分布")
    : isSkillDistribution
      ? distributionTitle || t("技能分布")
      : t("岗位分布");

  const option = useMemo(() => ({
    ...buildChartOption({
      chartType,
      rows,
      mode,
      activeId: activeCategoryId,
      selectedSkillIds,
      t,
    }),
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 560,
    animationEasing: "cubicOut",
  }), [activeCategoryId, chartType, mode, reduceMotion, rows, selectedSkillIds, t]);

  clickHandlerRef.current = (params) => {
    const row = params?.data;
    if (!row || row.selectable === false) return;
    const event = params.event?.event;
    if (skillOverview) {
      onSkillSelect?.(
        { id: row.id, type: "skill" },
        { additive: Boolean(event?.ctrlKey || event?.metaKey) },
      );
      return;
    }
    if (!onCategorySelect) return;
    onCategorySelect(activeCategoryId === row.id ? null : row.id);
  };

  useEffect(() => {
    if (!chartRef.current) return undefined;
    const chart = echarts.init(chartRef.current, null, { renderer: "canvas" });
    instanceRef.current = chart;

    const onClick = (params) => clickHandlerRef.current?.(params);
    chart.on("click", onClick);

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.off("click", onClick);
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;
    chart.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;
    const frame = requestAnimationFrame(() => chart.resize());
    return () => cancelAnimationFrame(frame);
  }, [chartType]);

  const goPrev = () => {
    setChartTypeIndex((index) => (index - 1 + CHART_TYPES.length) % CHART_TYPES.length);
  };

  const goNext = () => {
    setChartTypeIndex((index) => (index + 1) % CHART_TYPES.length);
  };

  return (
    <div className="panel-section pie-section distribution-chart-section">
      <div className="distribution-chart-header">
        <p className="panel-kicker">{title}</p>
        <div className="distribution-chart-switch" role="group" aria-label={t("切换图表类型")}>
          <button type="button" className="chart-nav-btn" onClick={goPrev} aria-label={t("上一张图表")}>
            <ChevronLeft size={16} />
          </button>
          <span className="chart-type-label">{t(CHART_TYPE_LABELS[chartType])}</span>
          <button type="button" className="chart-nav-btn" onClick={goNext} aria-label={t("下一张图表")}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="pie-layout">
        <div
          ref={chartRef}
          className="pie-chart echarts-host"
          role="img"
          aria-label={`${title} · ${t(CHART_TYPE_LABELS[chartType])}`}
        />
      </div>
      <div className="chart-type-dots" role="group" aria-label={t("切换图表类型")}>
        {CHART_TYPES.map((type, index) => (
          <button
            key={type}
            type="button"
            className={index === chartTypeIndex ? "is-active" : ""}
            onClick={() => setChartTypeIndex(index)}
            aria-label={t(CHART_TYPE_LABELS[type])}
            aria-pressed={index === chartTypeIndex}
          />
        ))}
      </div>
    </div>
  );
});
