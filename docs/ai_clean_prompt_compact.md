# 数据清洗任务：移除与计算机无关的岗位

## 你的任务

审查 `data/` 目录下 7 家公司的原始岗位 JSON 数据，剔除所有与**计算机科学 / 软件工程**无关的岗位，更新数据集。

## 判断标准

### 保留（计算机相关）

- 软件开发（后端/前端/全栈/移动端/游戏客户端）
- AI/ML/算法（大模型、推荐、搜索、NLP、CV、Agent、RAG 等）
- 数据工程（大数据、数仓、数据湖、ETL、数据库、OLAP）
- 运维/SRE/DevOps（K8s、Docker、CI/CD）
- 安全工程、测试/QA
- 芯片设计（SoC/NPU/GPU 数字方向）、嵌入式软件、驱动开发、固件
- 系统/基础设施（Linux 内核、编译器、网络协议栈）
- 软件产品经理、AI 产品经理、数据产品经理
- 自动驾驶算法/车载软件/座舱软件（仅限软件方向）

### 剔除（非计算机相关）

- **汽车制造**：整车、底盘、发动机、电池结构、电机机械、车身内外饰、涂装/焊装/总装、热管理、线束、轮胎、NVH
- **零售/门店**：零售顾问、门店运营、服务顾问、交付专员、体验专家
- **营销/品牌**：整合营销、渠道管理、品类运营、GTM、公关、内容策划
- **HR/行政/财务**：招聘、培训、薪酬、企业文化、法务、审计
- **纯硬件制造**：机械结构、材料工程、模具、焊接、压铸（非芯片方向）
- **售后服务（非软件）**：空调/厨电/冰洗技术支持、钣金技师、索赔管理
- **IDC 纯设施**：机房电气、暖通、物理安全（不含网络架构/服务器运维）
- **纯美术/动画**：动捕动画师、角色原画、展陈设计（不含 shader/图形学方向）

### 边缘情况判断

1. 优先看 `description` + `requirement` 中是否出现编程语言/框架（Java, Python, Go, React, K8s 等）- 有就保留
2. 核心产出是"代码/系统/软件"还是"物理产品/业务流程"？
3. 不确定时**倾向于保留**

## 操作步骤

### 1. 审查原始数据

对以下文件逐一审查：

| 文件 | 重点关注 |
|------|---------|
| `data/xiaomi_tech_jobs.json` | **重灾区**：超过 80% 岗位不相关（汽车/零售/营销/家电） |
| `data/bytedance_jobs.json` | 基本纯净，仅有极少量非技术岗 |
| `data/tencent_jobs.json` | 少量游戏美术/非技术运营 |
| `data/jd_tech_jobs.json` | 仓储销售、电池标准化等非软件岗 |
| `data/meituan_tech_jobs.json` | 基本纯净 |
| `data/mihoyo_tech_jobs.json` | 基本纯净 |
| `data/bilibili_tech_jobs.json` | 动捕动画师、IDC 设施管理 |

### 2. 备份并过滤

对每个原始数据文件，备份后原地覆盖为过滤后的版本。**注意**：文件必须是合法的 JSON 数组格式（`[{...}, {...}]`），保持原字段结构不变。

### 3. 重建 processed 数据

```bash
node scripts/build_compact_data.mjs
```

该命令会自动读取 `data/` 下的过滤后数据，重新进行分类、技能提取、去重合并，生成：

- `data/processed/{source}.index.json`（岗位角色索引）
- `data/processed/{source}.details.{prefix}.json`（角色详情分片）
- `docs/role_merge_report.md`（合并报告）

### 4. 验证

建完后确认：
- 每个 `index.json` 的 `total_postings == complete_postings` 且 `total_roles` 正确
- 抽查若干角色确保没有残留明显无关岗位
- `skill_labels` 为空的角色不会大量出现（空技能标签是异常信号）

## 原始数据字段说明

原始 JSON 文件是各公司官网招聘页面的抓取数据，核心字段：

```json
{
  "job_id": "岗位ID",
  "title": "岗位名称",
  "description": "工作职责描述",
  "job_require": "任职要求描述",
  "url": "岗位链接"
}
```

不同公司字段名略有差异（如 `name` 替代 `title`、`requirement` 替代 `job_require`），但语义相同。判断时优先看 `title` + `description` + `requirement` 的组合文本。

## 辅助脚本

如果你需要先快速概览哪些岗位缺乏技能标签（这是发现不相关岗位的有效信号），可以运行：

```bash
python -c "
import json, glob
for f in sorted(glob.glob('data/processed/*.index.json')):
    source = f.split('/')[-1].replace('.index.json','')
    data = json.load(open(f))
    no_skills = [r for r in data['roles'] if not r.get('skill_labels')]
    print(f'{source}: {len(no_skills)}/{data[\"total_roles\"]} roles without skills')
    for r in no_skills[:10]:
        print(f'  [{r[\"category_key\"]}] {r[\"title\"]}')
"
```

## 预期结果

| 公司 | 过滤前 | 过滤后（预计） | 主要剔除类型 |
|------|--------|--------------|------------|
| bilibili | ~180 | ~170 | 动捕动画师、IDC 设施 |
| bytedance | ~9039 | ~9000 | 极少量非技术 |
| tencent | ~1140 | ~1100 | 游戏美术、非技术运营 |
| xiaomi | ~1422 | **~250-300** | 汽车制造/零售/营销/家电 |
| jd | ~587 | ~520 | 仓储销售、电池标准化 |
| meituan | ~490 | ~485 | 偶有非技术 |
| mihoyo | ~239 | ~230 | 纯美术技美 |

小米是本次清洗的核心目标，预计移除约 80% 的岗位。
