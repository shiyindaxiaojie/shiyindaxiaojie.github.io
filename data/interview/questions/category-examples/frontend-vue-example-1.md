---
id: frontend-vue-example-1
title: "Vue 响应式更新为什么不是数据一变，DOM 就立刻同步？"
slug: frontend-vue-example-1
tracks:
  - frontend
category: vue
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Vue"
  - "响应式系统"
  - "nextTick"
  - "副作用"
summary: "围绕Vue的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Vue 响应式更新为什么不是数据一变，DOM 就立刻同步？

::candidate level="core"::
响应式 setter 触发依赖后，更新任务会进入调度队列，同一轮多次修改被合并，再在微任务阶段刷新 DOM。读取更新后的 DOM 要等待 nextTick，但 nextTick 不是通用延时工具。

::interviewer::
别停在原理上，Vue落到线上先看什么证据？

::candidate level="deep"::
用 Vue Devtools、组件 render 追踪、Performance trace 和请求日志定位重复更新；验证清理函数是否在依赖变化与卸载时执行。

::interviewer::
Vue这套判断在哪个边界下会失效？

::candidate::
深度 watch 大对象会带来遍历成本，watchEffect 的隐式依赖又可能难维护。状态边界清楚比选择某个 API 更重要。
