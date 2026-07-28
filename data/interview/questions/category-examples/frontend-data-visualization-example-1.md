---
id: frontend-data-visualization-example-1
title: "十万点实时数据要画在浏览器里，先减少什么，再换什么渲染方案？"
slug: frontend-data-visualization-example-1
tracks:
  - frontend
category: data-visualization
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "数据可视化"
  - "大数据量渲染"
  - "Canvas/WebGL 渲染"
  - "指标口径"
summary: "围绕数据可视化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
十万点实时数据要画在浏览器里，先减少什么，再换什么渲染方案？

::candidate level="core"::
先按用户可见像素与分析目标做聚合、采样或窗口化，减少进入渲染的数据；再根据交互选择 Canvas、WebGL 或分层渲染。把十万 DOM 节点换成 Canvas 只是后半步，数据处理和主线程预算同样重要。

::interviewer::
这条数据可视化链路上线后，用什么证据验证设计？

::candidate level="deep"::
用帧率、长任务、内存、数据延迟和用户任务完成率评估，Performance trace 与数据管道日志要能对齐。

::interviewer::
数据可视化里最容易漏掉的失败分支是什么？

::candidate::
降采样会隐藏尖峰，WebGL 也会增加可访问性与导出成本。关键异常应保留原始点，并提供表格或明细入口。
