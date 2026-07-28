---
id: frontend-build-tooling-example-1
title: "Vite 构建产物太大，怎么找到真正该拆的依赖？"
slug: frontend-build-tooling-example-1
tracks:
  - frontend
category: build-tooling
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "构建工具"
  - "Vite"
  - "Tree Shaking"
  - "代码分割"
summary: "围绕构建工具的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Vite 构建产物太大，怎么找到真正该拆的依赖？

::candidate level="core"::
先用 bundle visualizer 看初始 chunk 由谁组成，再区分首屏必需、路由延迟加载和可替代依赖。拆包目标是减少关键路径下载与执行，不是把一个大包切成几十个仍会同时请求的小包。

::interviewer::
别停在原理上，构建工具落到线上先看什么证据？

::candidate level="deep"::
对比构建 metafile、chunk 依赖图、Coverage、真实网络瀑布和 JavaScript 执行时间，按版本设置体积预算。

::interviewer::
构建工具这套判断在哪个边界下会失效？

::candidate::
过度拆包会增加请求、缓存失效和运行时开销。稳定 vendor 与业务代码的缓存策略要结合实际更新频率，不照抄固定分组。
