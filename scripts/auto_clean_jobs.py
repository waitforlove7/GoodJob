#!/usr/bin/env python
'''
Final version - removes non-CS jobs with minimal false positives.
'''
import json, os, shutil, subprocess, sys
from pathlib import Path
from typing import List, Dict, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

RAW_FILES = {
    "bilibili":  "bilibili_tech_jobs.json",
    "bytedance":  "bytedance_jobs.json",
    "tencent":    "tencent_jobs.json",
    "xiaomi":     "xiaomi_tech_jobs.json",
    "jd":         "jd_tech_jobs.json",
    "meituan":    "meituan_tech_jobs.json",
    "mihoyo":     "mihoyo_tech_jobs.json",
}

SOFTWARE_SIGNALS = [
    "C/C++", "C语言", "Java", "Python", "Golang", "Go语言", "Rust",
    "JavaScript", "TypeScript", "Scala", "Kotlin", "Swift", "Objective-C",
    "Dart", "Flutter", "React", "Vue", "Webpack", "Vite", "Node.js",
    "HTML", "CSS", "小程序", "H5",
    "Kubernetes", "K8s", "Docker", "微服务", "RPC", "Service Mesh",
    "CI/CD", "DevOps", "SRE", "Git",
    "分布式系统", "高并发", "云原生", "Serverless",
    "机器学习", "深度学习", "PyTorch", "TensorFlow", "Transformer",
    "LLM", "大模型", "大语言模型", "NLP", "CV", "AIGC", "Agent", "RAG",
    "SFT", "RLHF", "Fine-Tuning", "Prompt Engineering",
    "神经网络", "模型训练", "模型推理", "模型优化",
    "Spark", "Flink", "Hadoop", "Kafka", "Hive", "ClickHouse",
    "数据湖", "数据仓库", "OLAP", "ETL",
    "MySQL", "Redis", "PostgreSQL", "MongoDB", "HBase", "Elasticsearch",
    "SQL", "数据库内核", "分布式数据库",
    "Linux内核", "操作系统内核", "编译器", "LLVM", "GCC", "RISC-V",
    "协议栈", "SDN", "BGP", "OSPF",
    "Android", "iOS", "APP开发", "SDK",
    "RTL", "Verilog", "VHDL", "EDA",
    "嵌入式软件", "Firmware", "固件", "驱动开发", "BSP", "底软",
    "MCU驱动", "HIL测试", "AUTOSAR",
    "自动驾驶算法", "感知算法", "规划控制", "SLAM", "定位算法",
    "域控软件", "车载软件", "OTA ", "OTA升级", "座舱软件", "车机系统",
    "BMS软件", "动力域软件", "车载语音", "车载AI", "车联网",
    "软件开发", "软件研发", "软件工程", "软件测试", "软件质量",
    "代码", "编程", "源码", "Code Review","研发",
    "系统架构设计", "技术方案", "算法设计", "算法优化",
    "API设计", "后端开发", "前端开发", "全栈", "客户端开发",
    "算法工程师", "算法专家", "算法研究员",
    "数据工程师", "数据分析师", "数据科学家", "数据开发",
    "安全工程师", "安全开发", "安全技术", "安全审计",
    "运维工程师", "运维开发", "架构师", "架构设计",
    "技术项目经理", "技术经理", "技术总监", "研发总监",
    "Unity", "Unreal", "Cocos", "游戏引擎",
    "芯片设计", "SoC", "DDR", "高速接口", "触控芯片",
    "数字前端", "数字后端", "数字验证",
    "自动化测试", "压力测试", "单元测试", "集成测试",
    "接口测试", "性能测试", "测试工具",
]

TITLE_CS_PATTERNS = [
    "安全攻防", "安全SE", "安全策略", "渗透测试", "漏洞",
    "安全研发", "SDLC", "红蓝对抗", "安全合规",
    "网络安全方案", "终端安全运营",
    "应用和框架安全", "办公安全", "IT安全",
    "RTL设计", "数字IC", "模拟IC", "射频模拟芯片", "RFIC",
    "SOC设计", "NPU设计", "GPU设计",
    "嵌入式", "Firmware", "固件", "BSP", "底软", "RTOS",
    "MCU", "单片机",
    "数据产品经理", "数据产品专家", "数仓产品", "数字化产品", "售后数字化",
    "图形算法", "渲染开发", "3A渲染", "shader",
    "GPU渲染", "OpenGL", "Vulkan", "DirectX",
    "技术经理", "技术总监", "研发经理", "研发总监",
    "品牌官网", "UI设计", "交互设计",
    "电机控制器应用", "电机控制器系统",
    "OTA车端", "DDR设计", "AI产品经理",
    "智能驾驶产品", "自动驾驶产品",
    "芯片设计", "芯片硬件测试", "芯片应用",
    "穿戴高级软件", "智能网联",
    "数据产品", "产品运营",
    "影像算法", "影像测评",
    "多媒体效果", "音频调试",
    "测试开发", "测试工程", "测试架构", "VMOS",
    "充电功能开发",
]

XIAOMI_HARD_EXCLUDE = [
    "热管理零部件", "热管理属性",
    "整车泛化测试-道路", "整车泛化测试-智驾",
    "整车道路试验",
    "结构耐撞", "乘员保护",
    "内饰工程师", "内饰测试", "硬内饰",
    "外饰测试", "外饰装饰", "外饰集成",
    "座椅舒适性",
    "车门结构", "门把手", "门锁",
    "开闭件", "密封系统",
    "软饰开发",
    "上车体布置",
    "动力系统验证",
    "电池系统工程师", "电芯平台",
    "电驱集成管理", "电驱总成机械",
    "加热器开发",
    "压缩机开发",
    "能量流开发",
    "Pack工艺",
    "减速器机械", "减速箱",
    "发动机系统", "发动机旋转",
    "增程器",
    "智能制造-纤维",
    "焊装", "涂装", "总装", "冲压", "压铸", "钣金",
    "生产制造", "生产经理", "生产工段",
    "整车功能测试", "道路测试工程师",
    "试验工程师",
    "电性能及EMC", "电气性能",
    "可靠性测试开发",
    "结构设计审核",
    "硬件设计审核",
    "零部件设计总监",
    "质量工程师-整车", "质量部-车型",
    "先进动力研发质量", "先进动力质量",
    "系统质量促进-整车硬件",
    "硬件工程师-电池",
    "硬件工程师-电驱", "硬件工程师-电控",
    "硬件工程师-车载电源",
    "硬件工程师-BMS",
    "车载电源硬件",
    "资深外饰设计师", "汽车零部件设计总监",
    "造型设计", "国际汽车创意",
    "线上服务专员", "服务质量专员",
    "线上技术专家", "在线技术专家",
    "中央技术支持", "区域技术支持",
    "资产及预算", "车周边供应链",
    "产品传播",
    "新媒体运营", "新媒体能力", "新媒体管理",
    "视频设计-导演",
    "投资经理", "商务拓展经理", "商务经理",
    "分公司服务经理",
    "机电工程师",
    "网络规划高级经理",
    "产品数据管理-CAD", "产品数据管理-MBOM",
    "工程配置管理",
    "供应商流程",
    "流程落地实施", "项目管理（国际",
    "资源管理工程师",
    "产品经理-整车方向", "产品经理（整车方向",
    "产品经理-性能方向",
    "影音产品负责人",
    "音响产品经理",
    "系统测试工程师-WiFi TSE",
    "系统测试工程师-蓝牙",
    "系统测试PM",
    "硬件工艺-显示",
    "可靠性高工", "可靠性工程师",
    "基带高工", "基带工程师",
    "天线工程师", "天线专家", "天线高工",
    "射频硬件工程师", "射频高工", "器件规划",
    "结构工程师", "结构高工",
    "结构专家（非",
    "高级仿真",
    "失效分析", "板级可靠性",
    "模组可靠性",
    "硬件研发工程师-Sensor", "硬件研发工程师-光学",
    "硬件研发工程师-架构", "硬件研发工程师-马达",
    "摄像头硬件", "耳机产品专家",
    "可穿戴整机结构", "大硬件经理",
    "智能硬件功能件", "显示面板", "面板光学",
    "手机COE", "手机部-架构", "笔记本SA",
    "机器人结构", "机器人机械",
    "机器人灵巧", "机器人电机",
    "机器人高级ID",
    "机器人可靠性仿真",
    "硬件&网络设备采购",
    "高级结构专家",
    "Store Display", "Senior Global Product PR",
    "短剧专家",
    "策划经理", "策划",
    "用户体验洞察",
    "海外运营", "海外分期", "流量变现",
    "PMO", "OPS-",
    "商网负责人",
    "资深硬件专家", "CMF", "动画师", "原画",
    "RMPV-", "制造储备",
    "全球品牌",
    "合规经理", "品牌公关",
    "车间管理",
    "设备管理", "车间主任",
    "动力总成", "动力系统专家",
    "整车能量管理", "整车硬件部",
    "整车空调", "整车高压",
    "异响",
    "技术服务专员", "售后技术",
    "标定工程师", "匹配工程师",
    "试验策划", "试验策划工程师",
]

EXCLUDE_TITLE_PATTERNS = [
    "零售", "门店", "米家", "面销", "销售顾问", "事故顾问",
    "体验专家", "体验管理", "服务顾问", "服务主管", "服务派驻",
    "交付专员", "交付顾问", "交付保障", "交付接待", "交付预约",
    "交付运营", "交付区域", "交付经理", "交付体验", "交付服务",
    "国家交付负责人",
    "网格主管", "城市负责人", "储备干部",
    "售后工程师", "维修工程师", "维修技师",
    "冰洗技术支持", "小家电售后",
    "PDI", "配件索赔", "备件供需", "钣金技师", "钣金工程师",
    "机电顾问", "机电服务顾问",
    "用户体验运营", "事故服务顾问",
    "服务培训", "机电技术培训",
    "服务洞察经理", "服务技术主管",
    "售后质量工程师", "售前工程师",
    "空调产品技术支持", "大家电",
    "旗舰店", "展厅",
    "在线技术主管-售后",
    "整合营销", "品牌传播", "品牌策略", "品牌营销", "品牌内容",
    "内容策划", "内容传播", "创意策划", "短视频策划",
    "社交媒体", "效果广告运营", "直播营销",
    "GTM", "品类运营", "渠道管理", "渠道经理",
    "电商经理", "电商运营", "天猫", "京东渠道",
    "市场调研", "市场洞察", "公关经理", "舆情",
    "营销策划", "营销经理", "传播操盘手",
    "品牌市场", "国际内容营销", "汽车运动营销", "行销经理",
    "招聘经理", "招聘主管", "招聘专家", "高招", "HRBP",
    "培训运营", "培训师", "培训项目设计", "课程开发",
    "培训中心", "人才发展", "企业文化", "薪酬策略",
    "财务BP", "费用BP", "内控经理", "成本经理", "成本分析",
    "渠道财经",
    "法务", "专利工程师", "知识产权",
    "公共事务", "政府关系",
    "行政", "办公室管理",
    "薪酬福利", "绩效管理", "员工关系",
    "人力资源经理", "人才招募",
    "发动机", "变速箱", "减振器", "制动系统", "制动DRE",
    "轮胎", "轮辋", "底盘电控", "底盘高压",
    "冷却系统", "润滑系统",
    "车身工程", "车身工艺", "车身生产",
    "外饰工程", "外饰灯具", "内饰零", "座椅DRE",
    "车门系统", "尾门系统", "保险杠", "碳纤维装饰",
    "线束", "高压线束",
    "进气系统", "排气系统",
    "整车防腐", "整车NVH", "整车碰撞", "整车高压",
    "电机机械设计", "电机电磁",
    "大功率板载电源", "DC-DC", "OBC",
    "增程器", "增程能量", "车载电源磁件", "车载电源结构",
    "热管理零部件", "热管理属性",
    "耐久属性", "能量流开发",
    "运动控制集成", "运动集成控制",
    "腐蚀", "NVH试验", "耐久试验", "压缩机",
    "电芯", "隔膜",
    "整车工程-轮胎", "整车方向（非",
    "性能方向（非",
    "橡胶", "声学器件",
    "动态性能开发", "动态性能调校",
    "音响系统", "音响产品",
    "车辆动力学",
    "结构耐久试验",
    "钙钛矿", "光伏", "太阳能电池",
    "非标自动化", "装配工艺", "涂胶工艺", "焊接工程师",
    "结构工程师（非", "结构设计（非",
    "机械集成", "机械开发",
    "材料工程师", "材料开发", "材料专家", "电解液",
    "外观工艺", "CMF设计师",
    "模具工程师", "模修",
    "资源管理工程师（非",
    "半导体资源开发",
    "物流", "仓储", "仓库",
    "物料跟踪", "物料工程师", "物料计划",
    "采购经理", "采购运营", "采购工程师",
    "供应商质量", "SQE", "SIE",
    "整车物流", "售后配件", "配件调拨",
    "动捕动画师", "角色原画", "场景原画", "展陈设计",
    "汽车造型设计",
    "CAS Modeller", "Exterior Designer（",
    "二手车", "事故车", "参观接待", "工业旅游", "研学",
    "审计", "内控", "中央空调", "冰洗", "大家电", "厨电",
    "汽车销交服",
    "区域EHS", "环境安全", "安全管理",
    "网发经理", "网发-", "IDC数字化交付",
    "实验室安全", "EHS管理",
    "标准法规专家-国内",
    "汽车法规", "智驾法规",
    "质量班组长", "质量技师",
    "保鲜净化",
    "国际交付物流", "GTM高级专员",
    "海外商业化运营经理",
    "暖通技术", "数据中心建筑", "数据中心经理",
    "供应链与合研安全经理",
    "意健险理赔",
    "运营商经理", "运营商政企",
    "服务产品及市场", "车型外饰方向",
    "战略合作",
    "管理培训", "培训生",
    "RMPV-", "整车项目质量", "质量经理",
    "冰箱压缩机", "高级结构专家（非",
    "测试工程师-热管理",
    "招聘经理（forAI", "AI前沿材料",
    "手机部-可靠性", "手机部-基带", "手机部-天线",
    "手机部-结构", "手机部-硬件工艺",
    "手机部-SIPI", "手机COE",
    "可穿戴整机", "机器人结构", "机器人机械",
    "电机控制器硬件", "产品数据管理-CAD",
    "整车功能测试", "电气性能", "整车能量管理",
    "异响试验", "加热器开发",
    "硬件工程师-电池", "区域经理",
    "悬架", 
]


def load_json(path): return json.load(open(path, "r", encoding="utf-8"))
def save_json(path, data): json.dump(data if isinstance(data, list) else data.get("items", data.get("data", [])), open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

def full_text(job):
    return " ".join(str(job.get(k, "")) for k in ("title", "name", "description", "job_require", "requirement", "requirements"))

def is_cs(job, source):
    title = str(job.get("title", job.get("name", "")))
    text = full_text(job)
    tl = text.lower()

    if source == "xiaomi":
        for pat in XIAOMI_HARD_EXCLUDE:
            if pat in title:
                return False, f"hard-exclude: '{pat}'"

    for sig in SOFTWARE_SIGNALS:
        if sig.lower() in tl:
            return True, f"include: signal '{sig}'"

    for pat in TITLE_CS_PATTERNS:
        if pat in title:
            return True, f"include: title-cs '{pat}'"

    for pat in EXCLUDE_TITLE_PATTERNS:
        if pat in title:
            return False, f"exclude: '{pat}'"

    return True, "keep: default"

def audit(source, fname):
    path = DATA_DIR / fname
    if not path.exists(): return {"source": source, "file": fname, "total": 0, "keep": 0, "remove": 0}
    jobs = load_json(path)
    if not isinstance(jobs, list): jobs = jobs.get("items", jobs.get("data", []))
    keep, rem = [], []
    for j in jobs:
        ok, why = is_cs(j, source)
        (keep if ok else rem).append((j, why))
    return {"source": source, "file": fname, "total": len(jobs), "keep": len(keep), "remove": len(rem), "removed": rem, "keep_data": [j for j,_ in keep]}

def main():
    dry = "--execute" not in sys.argv
    print(f"=== JobCloud Auto-Clean {'DRY RUN' if dry else 'EXECUTE'} ===\n")

    results, tt, tk, tr = {}, 0, 0, 0
    for src, fn in RAW_FILES.items():
        print(f"\n--- {src} ({fn}) ---")
        r = audit(src, fn)
        results[src] = r
        tt += r["total"]; tk += r["keep"]; tr += r["remove"]
        print(f"  Total: {r['total']}, Keep: {r['keep']}, Remove: {r['remove']}")
        if 0 < r["remove"] <= 25:
            for j, why in r["removed"]:
                print(f"    - [{why}] {j.get('title', j.get('name', '?'))}")
        elif r["remove"] > 25:
            for j, why in r["removed"][:8]:
                print(f"    - [{why}] {j.get('title', j.get('name', '?'))}")
            print(f"    ... and {r['remove'] - 8} more")

    print(f"\n{'='*60}")
    print(f"  Total: {tt} | Keep: {tk} ({100*tk/max(tt,1):.1f}%) | Remove: {tr}")
    print(f"{'='*60}")

    if dry:
        print("\nRun: python scripts/auto_clean_jobs.py --execute")
        return

    print("\n=== Executing ===\n")
    bu = DATA_DIR / "backup_before_clean"
    bu.mkdir(exist_ok=True)
    for src, r in results.items():
        if not r.get("file") or r["total"] == 0: continue
        fp = DATA_DIR / r["file"]
        shutil.copy2(fp, bu / r["file"])
        print(f"  Backed up: {r['file']}")
        save_json(fp, r["keep_data"])
        print(f"  Filtered:  {r['file']} ({r['total']} -> {r['keep']})")

    print("\n=== Rebuilding processed data ===\n")
    r2 = subprocess.run(["node", str(ROOT / "scripts" / "build_compact_data.mjs")], cwd=str(ROOT), capture_output=True, text=True)
    print(r2.stdout)
    if r2.returncode:
        print(f"ERROR: {r2.stderr}")
        sys.exit(1)
    print("=== Done! ===")

if __name__ == "__main__": main()
