---
id: frontend-vue-example-2
title: "computed、watch 和 watchEffect 的副作用边界怎么分？"
slug: frontend-vue-example-2
tracks:
  - frontend
category: vue
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Vue"
  - "响应式系统"
  - "nextTick"
  - "副作用"
summary: "围绕Vue的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
computed、watch 和 watchEffect 的副作用边界怎么分？

::candidate level="deep"::
computed 负责纯派生值并缓存，watch 适合明确数据源与可控副作用，watchEffect 自动收集同步阶段依赖，适合简单联动。网络请求和监听器要处理清理与竞态，不能藏进 computed。

::interviewer::
如果现场现象和预期不一致，Vue怎么继续缩小范围？

::candidate level="deep"::
用 Vue Devtools、组件 render 追踪、Performance trace 和请求日志定位重复更新；验证清理函数是否在依赖变化与卸载时执行。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
深度 watch 大对象会带来遍历成本，watchEffect 的隐式依赖又可能难维护。状态边界清楚比选择某个 API 更重要。
