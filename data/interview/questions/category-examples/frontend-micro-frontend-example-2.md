---
id: frontend-micro-frontend-example-2
title: "子应用独立发布后，怎样避免依赖和样式互相污染？"
slug: frontend-micro-frontend-example-2
tracks:
  - frontend
category: micro-frontend
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "微前端"
  - "团队边界"
  - "运行时隔离"
  - "独立发布"
summary: "围绕微前端的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
子应用独立发布后，怎样避免依赖和样式互相污染？

::candidate level="deep"::
运行时隔离可用 sandbox、Shadow DOM 或命名约束，共享依赖要有兼容策略与失败回退。子应用契约版本化，壳负责加载、路由和错误边界，但不应承载全部业务状态。

::interviewer::
如果现场验证这项微前端判断，先看哪些指标或日志？

::candidate level="deep"::
监控每个子应用的加载耗时、错误、版本和资源体积，契约测试与跨应用 E2E 要覆盖独立发布组合。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
共享依赖减少体积却增加版本耦合，完全隔离则重复下载。选择应基于真实包大小、缓存和升级节奏。
