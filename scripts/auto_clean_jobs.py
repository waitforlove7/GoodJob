#!/usr/bin/env python3
"""
Auto-clean job data: filter out non-CS jobs from raw data files,
then trigger rebuild of processed data.

Usage:
    python scripts/auto_clean_jobs.py               # dry-run: report what would be removed
    python scripts/auto_clean_jobs.py --execute       # actually filter and rebuild
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"

# ---------------------------------------------------------------------------
# Configuration: which raw files to process
# ---------------------------------------------------------------------------
RAW_FILES = {
    "bilibili": "bilibili_tech_jobs.json",
    "bytedance": "bytedance_jobs.json",
    "tencent": "tencent_jobs.json",
    "xiaomi": "xiaomi_tech_jobs.json",
    "jd": "jd_tech_jobs.json",
    "meituan": "meituan_tech_jobs.json",
    "mihoyo": "mihoyo_tech_jobs.json",
}

# ---------------------------------------------------------------------------
# Title-level INCLUDE overrides — if found in the title, KEEP the job no
# matter what other exclusions are present. This is the strongest signal
# and runs before any exclusion check.
# ---------------------------------------------------------------------------
OVERRIDE_TITLE_INCLUDE = [
    # Software roles
    "软件工程师", "软件开发", "软件研发", "软件测试", "软件质量",
    "算法工程师", "算法专家", "算法研究员",
    "驱动软件", "固件", "Firmware",
    "研发Leader", "研发工程师", "开发工程师", "技术Leader",
    "架构师", "架构工程师", "解决方案架构",
    "测试开发", "测试工程",
    "数据工程师", "数据分析师", "数据科学家", "数据开发",
    "安全工程师", "安全开发", "安全技术", "安全审计工程师", "火山引擎",
    "运维工程师", "运维开发", "SRE",
    "后端", "前端", "全栈", "客户端",
    # AI / ML
    "AI", "大模型", "Agent", "机器学习", "深度学习", "NLP", "CV",
    # Systems
    "编译器", "LLVM", "内核",
    "网络研发", "网络协议", "网络架构", "CDN", "负载均衡",
    # Auto software
    "自动驾驶", "感知", "规划算法", "控制算法", "SLAM",
    "座舱软件", "车机", "OTA软件",
    # Management (tech)
    "技术项目经理", "技术经理", "技术总监", "研发总监",
]

# ---------------------------------------------------------------------------
# Full-text INCLUDE overrides — if found anywhere in title+description+requirements,
# KEEP the job. Runs after title-level includes but before exclusions.
# ---------------------------------------------------------------------------
OVERRIDE_INCLUDE_KEYWORDS = [
    # Programming languages (with spaces to avoid partial matches like "C1")
    "C/C++", "Java", "Python", "Golang", "Go语言", "Rust", "JavaScript", "TypeScript",
    "Scala", "Kotlin", "Swift", "Objective-C", "Dart", "Flutter",
    # Web
    "React", "Vue", "Webpack", "Vite", "Node.js", "HTML/CSS",
    # Cloud/Infra
    "Kubernetes", "K8s", "Docker", "微服务", "RPC", "Service Mesh",
    # AI/ML
    "机器学习", "深度学习", "PyTorch", "TensorFlow", "Transformer",
    "LLM", "大模型", "大语言模型", "NLP", "CV", "AIGC", "Agent", "RAG",
    "SFT", "RLHF", "Fine-Tuning", "Prompt Engineering",
    # Big Data
    "Spark", "Flink", "Hadoop", "Kafka", "Hive", "ClickHouse",
    "数据湖", "数据仓库", "OLAP", "ETL",
    # Databases
    "MySQL", "Redis", "PostgreSQL", "MongoDB", "HBase", "Elasticsearch",
    "SQL优化", "数据库内核", "分布式数据库",
    # Systems
    "分布式系统", "高并发", "Linux内核", "操作系统内核",
    "编译器", "LLVM", "GCC", "RISC-V",
    # Chip / embedded
    "芯片设计", "SoC", "RTL", "Verilog", "VHDL",
    "嵌入式软件", "Firmware", "固件",
    "驱动开发", "BSP", "底软",
    # Auto software
    "自动驾驶算法", "感知算法", "规划控制", "SLAM", "定位算法",
    "域控软件", "车载软件", "OTA", "座舱软件", "车机系统",
    "MCU驱动", "HIL测试", "BMS软件", "动力域软件",
    "车载语音", "车载AI", "车联网",
    # General software engineering
    "CI/CD", "DevOps", "SRE", "Git", "Code Review",
    "系统架构设计", "技术方案", "源码",
    # Game dev
    "Unity", "Unreal", "Cocos", "游戏引擎",
]

# ---------------------------------------------------------------------------
# EXCLUDE_TITLE_KEYWORDS — if a keyword appears in the job title AND no
# INCLUDE override has matched, the job is excluded.
# These must be specific enough to avoid false positives.
# ---------------------------------------------------------------------------
EXCLUDE_TITLE_KEYWORDS = [
    # === Automotive / vehicle MANUFACTURING roles (not software) ===
    "发动机缸盖", "发动机缸体", "发动机曲轴", "发动机正时",
    "发动机耐火", "发动机NVH", "发动机台架", "发动机试验",
    "变速箱", "减速器机械", "减速器NVH",
    "悬架系统", "减振器", "制动系统", "制动DRE",
    "轮胎", "轮辋", "底盘电控",
    "冷却系统", "润滑系统", "空调系统",
    "空调系统工程师", "热管理系统工程师",
    "车身工程师", "车身工艺", "车身生产",
    "外饰工程师", "外饰灯具", "内饰零部件", "座椅DRE",
    "车门系统", "尾门系统", "玻璃系统",
    "保险杠工程师", "碳纤维装饰",
    "线束工程师", "线束开发", "高压线束",
    "进气系统", "排气系统",
    "整车防腐", "整车NVH", "整车碰撞",
    "焊装", "涂装", "总装", "冲压", "压铸", "钣金",
    "生产制造", "生产经理", "生产工段", "返修",
    "电驱减速箱", "电机机械设计", "电机电磁",
    "大功率板载电源", "DC-DC", "OBC",
    "增程器", "增程能量",
    "车载电源磁件", "车载电源结构",
    "热管理零部件", "压缩机开发",
    "耐久属性", "能量流开发",
    "运动控制集成", "运动集成控制",
    "底盘高压管路", "底盘减振器",
    "腐蚀", "NVH试验", "耐久试验", "结构耐久",

    # === Retail / store operations ===
    "零售顾问", "零售主管", "零售经理", "门店运营", "门店管理", "面销",
    "体验专家", "体验管理", "服务顾问", "服务主管", "服务派驻",
    "交付专员", "交付顾问", "交付保障", "交付接待", "交付预约",
    "网格主管", "区域经理（", "城市负责人", "米家负责人",
    "手机品类储备干部", "新零售米家",
    "销售顾问", "事故顾问",
    "售后工程师", "维修工程师", "技术支持岗", "冰洗技术支持专家", "小家电售后技术支持岗", "技术支持岗", "维修技师",
    "PDI管理", "PDI质量管理", "配件索赔", "备件",
    "钣金技师", "钣金工程师", "机电顾问", "机电服务顾问",
    "用户体验专家", "用户体验运营", "服务体验",
    "事故服务顾问", "事故顾问",
    "服务培训高级经理", "机电技术培训",

    # === Marketing / brand / content ===
    "整合营销", "品牌传播", "品牌策略", "品牌营销", "品牌内容",
    "内容策划", "内容传播", "创意策划", "短视频策划",
    "社交媒体", "效果广告运营", "直播营销",
    "GTM", "品类运营", "渠道管理", "渠道经理",
    "电商经理", "电商运营", "天猫", "京东渠道",
    "市场调研", "市场洞察", "公关经理", "舆情",
    "营销策划专家", "营销经理",
    "传播操盘手", "品牌市场营销", "国际内容营销",
    "汽车运动营销", "行销经理",

    # === HR / admin / finance / legal ===
    "招聘经理", "招聘主管", "招聘专家", "高招", "HRBP",
    "培训运营", "培训师", "培训项目设计", "课程开发",
    "人才发展", "企业文化", "薪酬策略",
    "财务BP", "费用BP", "内控经理", "成本经理", "成本分析",
    "法务", "专利工程师", "知识产权",
    "公共事务", "政府关系",
    "行政", "办公室管理", "Office Administrator",
    "薪酬福利", "绩效管理", "员工关系",

    # === Non-software hardware / industrial ===
    "非标自动化",
    "装配工艺", "涂胶工艺", "焊接工程师",
    "结构工程师（非芯片", "结构设计（非芯片",
    "电机机械设计", "减速器机械", "机械集成",
    "材料开发", "材料专家", "电解液", "隔膜",
    "热设计", "散热", "热仿真",
    "外观工艺", "CMF设计师",
    "模具工程师", "模修",
    "工艺研发工程师", "工艺工程师",

    # === Non-tech design / animation ===
    "动捕动画师", "角色原画", "场景原画", "展陈设计",
    "CMF设计",
    "创意设计（汽车", "汽车造型设计",
    "CAS Modeller", "Exterior Designer（Automotive",

    # === Logistics / supply chain (non-software) ===
    "物流工程师", "物流规划", "仓库管理", "仓储物流",
    "物料跟踪", "物料工程师", "采购经理", "采购运营",
    "供应商质量", "SQE", "SIE",
    "整车物流", "售后配件", "配件调拨",
    "资源管理工程师（非软件", "供应链直采",
    "采购经理-电子架构", "采购运营-电子架构",
    "半导体资源开发经理",

    # === Miscellaneous non-tech ===
    "二手车", "事故车", "展厅", "参观接待",
    "工业旅游", "研学", "审计", "合规",
    "中央空调", "冰洗", "大家电", "厨电", "小家电",
    "空调渠道", "空调售前", "智能硬件灯具",
    "汽车销交服", "交付运营", "交付区域",
    "区域EHS", "环境安全", "安全管理",
    "网发经理", "Network Development",
    "城市运营",
    "实验室安全", "EHS管理",
    "制造储备",
    "体验管理专家", "区域体验管理",
    "标准法规专家-国内",
    "汽车法规工程师-海外", "汽车法规专家-海外",
    "质量管理工程师（非软件",
    "质量促进", "质量班组长", "质量技师",
    "服务工程工程师", "服务技术主管",
    "备件业务运营", "配件订单",
    "门店服务中心",
    "运营商经理", "运营商政企经理",
    "服务产品及市场",
    "产品营销经理",
    "车型外饰方向", "整车方向（非软件",
    "性能方向（非软件",
    "交付服务", "交付运营管理", "交付区域管理",
    "人力资源", "人才招募",
]


def load_json(path: Path) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get("items", data.get("data", []))


def save_json(path: Path, data: List[Dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def job_text(job: Dict) -> str:
    """Combine all text fields for keyword matching."""
    title = str(job.get("title", job.get("name", "")))
    parts = [
        title,
        str(job.get("description", "")),
        str(job.get("job_require", "")),
        str(job.get("requirement", job.get("requirements", ""))),
    ]
    return " ".join(parts)


def is_computer_related(job: Dict) -> Tuple[bool, str]:
    """
    Determine if a job is computer-science related.
    Strategy (in order of priority):
    1. Title-level include overrides (strongest: "软件工程师", "架构师", etc.)
    2. Full-text include overrides (found programming/tech keywords anywhere)
    3. Title exclusion keywords (specific non-tech role indicators)
    4. Fuzzy fallback check for non-tech context
    Returns (is_related, reason_string).
    """
    text = job_text(job)
    title = str(job.get("title", job.get("name", "")))
    title_lower = title.lower()

    # --- Step 1: Title-level include overrides (strongest signal) ---
    for kw in OVERRIDE_TITLE_INCLUDE:
        if kw in title:
            return True, f"include: title contains '{kw}'"

    # --- Step 2: Full-text include overrides ---
    text_lower = text.lower()
    for kw in OVERRIDE_INCLUDE_KEYWORDS:
        if kw.lower() in text_lower:
            return True, f"include: found keyword '{kw}'"

    # --- Step 3: Title exclusions (only if no include override matched) ---
    for kw in EXCLUDE_TITLE_KEYWORDS:
        if kw in title:
            return False, f"exclude: title matches '{kw}'"

    # --- Step 4: Fuzzy check for non-tech context ---
    # If the title talks about non-software physical things and there's no
    # programming/software keyword in the text, it's likely non-tech.
    non_tech_title_patterns = [
        "汽车", "发动机", "底盘", "制动", "悬架", "电池", "电芯",
        "电机", "减速器", "热管理", "压缩机", "线束", "轮胎",
        "钣金", "涂装", "焊装", "总装", "冲压", "压铸",
        "零售", "门店", "销售", "售后",
        "营销", "品牌", "渠道", "运营经理", "市场",
        "招聘", "HR", "培训", "薪酬", "行政",
        "财务", "法务", "审计", "合规",
        "空调", "冰箱", "洗衣", "厨电",
    ]
    for pattern in non_tech_title_patterns:
        if pattern in title_lower:
            # Double-check: if the description mentions software engineering,
            # it might still be tech. Otherwise, exclude.
            software_signals = [
                "代码", "编程", "软件", "系统架构", "协议栈", "SDN", "BGP", "OSPF", "网络协议栈",
                "后端", "前端", "数据库", "算法", "AI", "模型",
                "研发", "架构", "测试开发", "C++", "Java",
                "Python", "Go", "Rust", "K8s", "Docker",
            ]
            if not any(s in text for s in software_signals):
                return False, f"exclude: non-tech title '{pattern}' with no software signals"

    # --- Step 5: Default to keeping ---
    return True, "keep: default (no exclusion matched)"


def audit_file(source: str, filename: str) -> Dict:
    """Audit a raw data file and report what would be removed."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        print(f"  [SKIP] {filename} not found")
        return {"source": source, "total": 0, "keep": 0, "remove": 0, "removed": []}

    jobs = load_json(filepath)
    keep = []
    remove = []

    for job in jobs:
        related, reason = is_computer_related(job)
        if related:
            keep.append(job)
        else:
            remove.append((job, reason))

    return {
        "source": source,
        "file": filename,
        "total": len(jobs),
        "keep": len(keep),
        "remove": len(remove),
        "removed": remove,
        "keep_data": keep,
    }


def main():
    dry_run = "--execute" not in sys.argv
    mode = "DRY RUN" if dry_run else "EXECUTE"
    print(f"=== JobCloud Auto-Clean {mode} ===\n")

    results = {}
    total_total = 0
    total_keep = 0
    total_remove = 0

    for source, filename in RAW_FILES.items():
        print(f"Auditing {source} ({filename})...")
        result = audit_file(source, filename)
        results[source] = result

        total_total += result["total"]
        total_keep += result["keep"]
        total_remove += result["remove"]

        print(f"  Total: {result['total']}, Keep: {result['keep']}, Remove: {result['remove']}")

        if result["remove"] > 0 and result["remove"] <= 30:
            for job, reason in result["removed"]:
                title = job.get("title", job.get("name", "N/A"))
                print(f"    - [{reason}] {title}")
        elif result["remove"] > 30:
            # Sample first 10
            for job, reason in result["removed"][:10]:
                title = job.get("title", job.get("name", "N/A"))
                print(f"    - [{reason}] {title}")
            print(f"    ... and {result['remove'] - 10} more")
        print()

    print(f"=== Summary ===")
    print(f"Total jobs: {total_total}")
    print(f"Kept:       {total_keep} ({100*total_keep/max(total_total,1):.1f}%)")
    print(f"Removed:    {total_remove} ({100*total_remove/max(total_total,1):.1f}%)")
    print(f"Files: {len(RAW_FILES)}")

    if dry_run:
        print(f"\nThis was a DRY RUN. To execute for real, run:")
        print(f"  python scripts/auto_clean_jobs.py --execute")
        return

    # === EXECUTE MODE ===
    print("\n=== Executing: backing up and filtering raw data ===\n")

    backup_dir = DATA_DIR / "backup_before_clean"
    backup_dir.mkdir(exist_ok=True)

    import shutil

    for source, result in results.items():
        if result["total"] == 0:
            continue

        filepath = DATA_DIR / result["file"]

        # Backup original
        shutil.copy2(filepath, backup_dir / result["file"])
        print(f"  Backed up: {result['file']} -> backup_before_clean/")

        # Overwrite with filtered data
        save_json(filepath, result["keep_data"])
        print(f"  Filtered:  {result['file']} ({result['total']} -> {result['keep']})")

    # === Rebuild processed data ===
    print("\n=== Rebuilding processed data ===\n")
    result = subprocess.run(
        ["node", "scripts/build_compact_data.mjs"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"ERROR: {result.stderr}")
        sys.exit(1)

    print("\n=== Done! ===")
    print(f"Raw data filtered, processed data rebuilt, backup saved at data/backup_before_clean/")


if __name__ == "__main__":
    main()
