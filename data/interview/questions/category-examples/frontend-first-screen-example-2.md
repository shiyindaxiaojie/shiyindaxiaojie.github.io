---
id: frontend-first-screen-example-2
title: "SSR 已经返回 HTML，为什么用户仍然点不动？"
slug: frontend-first-screen-example-2
tracks:
  - frontend
category: first-screen
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "首屏优化"
  - "LCP 指标"
  - "SSR 水合"
  - "关键资源"
summary: "围绕首屏优化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
SSR 已经返回 HTML，为什么用户仍然点不动？

::candidate level="deep"::
HTML 可见不等于 JavaScript 已完成水合。大 bundle、长任务、第三方脚本或水合不匹配都会阻塞事件。检查主线程与 hydration 标记，按岛屿或交互优先级延迟非关键水合。

::interviewer::
如果现场验证这项首屏优化判断，先看哪些指标或日志？

::candidate level="deep"::
RUM 分位数、Navigation/Resource Timing、Server-Timing 和 Performance trace 组成端到端证据，并按网络与设备分群。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
预加载过多会抢占真正关键资源，SSR 也增加服务器成本和缓存复杂度。每项优化都应验证关键路径，而不是堆提示。
