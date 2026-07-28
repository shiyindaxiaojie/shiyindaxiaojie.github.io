---
id: frontend-cache-strategy-example-2
title: "Service Worker 缓存旧接口数据，怎么避免页面长期不一致？"
slug: frontend-cache-strategy-example-2
tracks:
  - frontend
category: cache-strategy
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "缓存策略"
  - "HTTP 缓存"
  - "Service Worker 缓存"
  - "版本兼容"
summary: "围绕缓存策略的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Service Worker 缓存旧接口数据，怎么避免页面长期不一致？

::candidate level="deep"::
先为不同请求定义 network-first、cache-first 或 stale-while-revalidate，接口响应带版本和过期策略。Service Worker 更新要处理 waiting/activate，并在 schema 不兼容时清理旧缓存或迁移，不能永久兜底。

::interviewer::
如果现场验证这项缓存策略判断，先看哪些指标或日志？

::candidate level="deep"::
查看响应头、Age、ETag、CDN 命中、Service Worker 版本和资源 404；用跨版本页面会话做发布回归。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
强制 skipWaiting 可能让同一页面运行新旧代码混合。更新提示、资源保留和版本兼容要一起设计。
