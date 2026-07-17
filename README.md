# GoodJob

GoodJob 是一个面向技术岗位探索的交互式招聘数据可视化平台。它聚合多家公司的公开招聘数据，通过岗位星图、技能关系图和职业路径，帮助用户更直观地了解岗位分布、技能要求与成长方向。

[在线体验](https://good-job-kappa.vercel.app/) · [报告问题](https://github.com/waitforlove7/JobCloud/issues)

## 功能特性

- 聚合字节跳动、腾讯、小米、京东、美团、米哈游和哔哩哔哩的技术岗位数据
- 按公司、岗位类别、地点和技能搜索或筛选岗位
- 使用 Three.js 以三维星图展示岗位、类别与技能之间的关系
- 通过技能依赖图组合技能并查看匹配的岗位方向
- 通过职业路径展示技能进度与目标岗位的能力要求
- 支持中英文界面和响应式布局
- 对岗位详情进行分片和按需加载，降低初始数据加载量

## 技术栈

- React
- Vite
- Three.js
- Recharts
- Node.js Test Runner
- Playwright
- Vercel Analytics

## 快速开始

### 环境要求

- Node.js（建议使用当前 LTS 版本）
- npm

### 安装与运行

```bash
git clone https://github.com/waitforlove7/JobCloud.git
cd JobCloud
npm install
npm run dev
```

启动后，根据终端提示在浏览器中打开本地地址。

### 构建生产版本

```bash
npm run build
npm run preview
```

生产文件将生成在 `dist/` 目录中。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build:data` | 重新生成岗位索引、详情分片和合并报告 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 本地预览生产版本 |
| `npm test` | 运行自动化测试 |

## 数据更新

原始招聘数据位于 `data/`，应用使用的压缩索引和岗位详情分片位于 `data/processed/`。原始数据发生变化后，运行：

```bash
npm run build:data
```

该命令还会更新 `docs/role_merge_report.md` 中的岗位合并报告。

如需重新采集字节跳动岗位数据，可以运行：

```bash
node scripts/scrape_bytedance_jobs.mjs --max-pages 10
```

默认输出文件为 `data/bytedance_jobs.json`。请在采集和使用公开数据时遵守目标网站的服务条款及适用法律。

## 项目结构

```text
GoodJob/
├── data/       # 原始数据与应用使用的处理后数据
├── docs/       # 研究记录、数据审查及合并报告
├── scripts/    # 数据采集与处理脚本
├── src/        # React 应用、可视化组件及公司数据适配器
├── tests/      # 自动化测试
├── index.html  # Vite 页面入口
└── package.json
```

## 参与贡献

欢迎提交 Issue 或 Pull Request。开始修改前，请先创建独立分支，并确保测试与生产构建均能通过：

```bash
npm test
npm run build
```

## 数据声明

本项目中的招聘信息来自公开页面，仅用于研究、学习和信息展示。岗位内容、数量及有效状态可能随时间变化，请以各公司的官方招聘网站为准。本项目与所展示的公司不存在隶属或合作关系。

## 许可证

本项目采用 ISC License。
