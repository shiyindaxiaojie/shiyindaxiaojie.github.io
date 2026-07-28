---
id: frontend-build-tooling-example-2
title: "Tree Shaking 不生效时，先检查哪些代码和包配置？"
slug: frontend-build-tooling-example-2
tracks:
  - frontend
category: build-tooling
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "构建工具"
  - "Vite"
  - "Tree Shaking"
  - "代码分割"
summary: "围绕构建工具的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Tree Shaking 不生效时，先检查哪些代码和包配置？

::candidate level="deep"::
确认使用 ESM 静态导入导出，包的 sideEffects 标记正确，没有 CommonJS 包装或动态属性访问阻碍分析。还要看 barrel file 是否意外拉入整个模块，以及生产构建是否真的开启优化。

::interviewer::
如果现场现象和预期不一致，构建工具怎么继续缩小范围？

::candidate level="deep"::
对比构建 metafile、chunk 依赖图、Coverage、真实网络瀑布和 JavaScript 执行时间，按版本设置体积预算。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
过度拆包会增加请求、缓存失效和运行时开销。稳定 vendor 与业务代码的缓存策略要结合实际更新频率，不照抄固定分组。
