---
id: frontend-react-example-1
title: "React 组件重复渲染时，怎么判断该不该用 memo？"
slug: frontend-react-example-1
tracks:
  - frontend
category: react
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "React"
  - "组件渲染"
  - "Hooks"
  - "闭包"
summary: "围绕React的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
React 组件重复渲染时，怎么判断该不该用 memo？

::candidate level="core"::
先用 Profiler 看提交频率和耗时，确认渲染真的贵，再找状态放置和 props 引用不稳定。memo 只省可跳过的渲染，比较本身也有成本；更优先缩小状态影响范围和稳定真正必要的对象。

::interviewer::
别停在原理上，React落到线上先看什么证据？

::candidate level="deep"::
用 React Profiler、why-did-you-render 或自定义标记与 Performance trace 对齐，修复后比较 commit 数和交互耗时。

::interviewer::
React这套判断在哪个边界下会失效？

::candidate::
useMemo/useCallback 不是语义保证，React 可以重新计算。若正确性依赖引用永远不变，状态模型本身就需要重构。
