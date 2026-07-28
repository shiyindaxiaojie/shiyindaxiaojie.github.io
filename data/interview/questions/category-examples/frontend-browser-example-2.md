---
id: frontend-browser-example-2
title: "强缓存命中后，页面为什么仍可能白屏很久？"
slug: frontend-browser-example-2
tracks:
  - frontend
category: browser
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "浏览器"
  - "关键渲染路径"
  - "HTTP 缓存"
  - "主线程"
summary: "围绕浏览器的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
强缓存命中后，页面为什么仍可能白屏很久？

::candidate level="deep"::
缓存只省网络下载，JavaScript 解析执行、数据请求、字体、主线程长任务和水合仍可能阻塞。先看 Navigation Timing 与资源瀑布，再看主线程 trace；缓存命中并不代表渲染路径短。

::interviewer::
如果现场现象和预期不一致，浏览器怎么继续缩小范围？

::candidate level="deep"::
用 DevTools Network、Performance、Coverage 和 Web Vitals 对齐阶段耗时，禁用缓存与不同网络条件做对照。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
浏览器和协议实现会变化，关键是用时间线定位而非死记固定顺序。Service Worker、HTTP/2/3 与预加载都会改变资源行为。
