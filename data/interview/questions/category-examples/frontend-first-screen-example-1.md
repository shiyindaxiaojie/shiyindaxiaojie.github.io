---
id: frontend-first-screen-example-1
title: "首屏 5 秒，怎样判断先改服务端、资源还是渲染？"
slug: frontend-first-screen-example-1
tracks:
  - frontend
category: first-screen
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "首屏优化"
  - "LCP 指标"
  - "SSR 水合"
  - "关键资源"
summary: "围绕首屏优化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
首屏 5 秒，怎样判断先改服务端、资源还是渲染？

::candidate level="core"::
先按导航、TTFB、资源发现、下载、LCP 渲染和可交互拆时间。TTFB 长处理服务端或缓存，关键资源发现晚调整 HTML/preload，下载大优化图片与 JS，主线程忙则拆包和切任务。先找到最大段再动手。

::interviewer::
这个首屏优化方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
RUM 分位数、Navigation/Resource Timing、Server-Timing 和 Performance trace 组成端到端证据，并按网络与设备分群。

::interviewer::
首屏优化发生部分失败时，系统怎样收敛？

::candidate::
预加载过多会抢占真正关键资源，SSR 也增加服务器成本和缓存复杂度。每项优化都应验证关键路径，而不是堆提示。
