---
id: browser-cache-strategy
title: 浏览器强缓存和协商缓存应该怎么配合？
slug: browser-cache-strategy
tracks:
  - frontend
category: browser
stage: technical
difficulty: junior
questionType: principle
frequency: medium
tags:
  - HTTP 缓存
  - 强缓存
  - 协商缓存
  - 缓存策略
summary: 高频基础题，但很适合看候选人是否只会背响应头名字。
estimatedRead: 4
related:
  - cicd-blue-green-rollout
---

::interviewer::
强缓存和协商缓存应该怎么配合？

::candidate level="core"::
静态资源通常先尽量走强缓存，通过文件名版本化保证更新；  
当资源不能长期强缓存时，再用协商缓存降低重复传输成本。

::interviewer::
那什么场景更依赖协商缓存？

::candidate::
比如 HTML、接口结果这类经常变化但又不能每次都全量下载的内容。  
这时会更依赖 `ETag` 或 `Last-Modified` 来判断资源是否真的变了。

::candidate level="deep"::
如果再往工程上讲，我会把资源分层：

1. 带 hash 的静态文件长期强缓存。
2. HTML 短缓存或不缓存。
3. CDN、浏览器和服务端的缓存策略保持一致。

::note::
面试加分点在于你能把“缓存头配置”和“资源发布策略”一起讲出来。
