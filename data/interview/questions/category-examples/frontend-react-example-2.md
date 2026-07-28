---
id: frontend-react-example-2
title: "Hooks 依赖数组写错，会引发哪些状态一致性问题？"
slug: frontend-react-example-2
tracks:
  - frontend
category: react
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "React"
  - "组件渲染"
  - "Hooks"
  - "闭包"
summary: "围绕React的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Hooks 依赖数组写错，会引发哪些状态一致性问题？

::candidate level="deep"::
漏依赖会让闭包读到旧值，产生过期请求、订阅或判断；多写不稳定依赖则会重复执行甚至循环。effect 应描述与外部系统同步的过程，并在重跑前正确清理。

::interviewer::
如果现场现象和预期不一致，React怎么继续缩小范围？

::candidate level="deep"::
用 React Profiler、why-did-you-render 或自定义标记与 Performance trace 对齐，修复后比较 commit 数和交互耗时。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
useMemo/useCallback 不是语义保证，React 可以重新计算。若正确性依赖引用永远不变，状态模型本身就需要重构。
