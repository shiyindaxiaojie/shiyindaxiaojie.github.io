---
id: frontend-cache-strategy-example-1
title: "静态资源怎样做到长缓存，又能在发布后立刻更新？"
slug: frontend-cache-strategy-example-1
tracks:
  - frontend
category: cache-strategy
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "缓存策略"
  - "HTTP 缓存"
  - "Service Worker 缓存"
  - "版本兼容"
summary: "围绕缓存策略的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
静态资源怎样做到长缓存，又能在发布后立刻更新？

::candidate level="core"::
内容哈希文件使用 immutable 长缓存，HTML 与入口清单短缓存或协商缓存。新发布生成新 URL，旧资源保留一段时间，避免仍打开的页面动态加载 chunk 时 404。

::interviewer::
这个缓存策略方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
查看响应头、Age、ETag、CDN 命中、Service Worker 版本和资源 404；用跨版本页面会话做发布回归。

::interviewer::
缓存策略发生部分失败时，系统怎样收敛？

::candidate::
强制 skipWaiting 可能让同一页面运行新旧代码混合。更新提示、资源保留和版本兼容要一起设计。
