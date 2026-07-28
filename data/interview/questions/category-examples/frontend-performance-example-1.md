---
id: frontend-performance-example-1
title: "首屏慢时，怎么围绕 LCP 把问题拆到具体资源？"
slug: frontend-performance-example-1
tracks:
  - frontend
category: performance
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "前端性能"
  - "Core Web Vitals"
  - "LCP 指标"
  - "INP 指标"
summary: "围绕前端性能的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
首屏慢时，怎么围绕 LCP 把问题拆到具体资源？

::candidate level="core"::
先确认 LCP 元素和真实用户分布，再把时间拆成 TTFB、资源发现、下载和渲染延迟。服务端慢就处理缓存或流式输出，资源发现晚就看 HTML 与 preload，图片大就调尺寸与格式，渲染迟则查 CSS、字体和主线程。

::interviewer::
别停在原理上，前端性能落到线上先看什么证据？

::candidate level="deep"::
结合 RUM 的 LCP/INP 分位数、Performance trace、Long Tasks、资源瀑布和版本切片；实验室 Lighthouse 只用于复现线索。

::interviewer::
前端性能这套判断在哪个边界下会失效？

::candidate::
优化平均值会掩盖低端机和弱网。预算要按真实用户分群，并防止为了分数延迟必要交互或牺牲可访问性。
