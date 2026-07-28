---
id: frontend-performance-example-2
title: "INP 很差但接口不慢，前端重点查什么？"
slug: frontend-performance-example-2
tracks:
  - frontend
category: performance
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "前端性能"
  - "Core Web Vitals"
  - "LCP 指标"
  - "INP 指标"
summary: "围绕前端性能的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
INP 很差但接口不慢，前端重点查什么？

::candidate level="deep"::
INP 关注交互到下一次绘制，接口快也可能被长任务、同步计算、频繁布局或组件大范围更新拖住。用 Performance 面板找事件处理、样式布局与绘制时间，再拆分任务、减少状态传播或把计算移出主线程。

::interviewer::
如果现场现象和预期不一致，前端性能怎么继续缩小范围？

::candidate level="deep"::
结合 RUM 的 LCP/INP 分位数、Performance trace、Long Tasks、资源瀑布和版本切片；实验室 Lighthouse 只用于复现线索。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
优化平均值会掩盖低端机和弱网。预算要按真实用户分群，并防止为了分数延迟必要交互或牺牲可访问性。
