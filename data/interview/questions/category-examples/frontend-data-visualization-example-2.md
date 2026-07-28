---
id: frontend-data-visualization-example-2
title: "图表数值正确但用户看不懂，问题可能出在哪一层？"
slug: frontend-data-visualization-example-2
tracks:
  - frontend
category: data-visualization
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "数据可视化"
  - "大数据量渲染"
  - "Canvas/WebGL 渲染"
  - "指标口径"
summary: "围绕数据可视化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
图表数值正确但用户看不懂，问题可能出在哪一层？

::candidate level="deep"::
检查指标口径、尺度、颜色、排序、单位和交互说明。双轴、截断坐标和默认聚合可能让正确数字产生错误判断；复杂图不一定比表格更有效，需要用任务测试验证。

::interviewer::
这项数据可视化设计怎么证明不是纸上方案？

::candidate level="deep"::
用帧率、长任务、内存、数据延迟和用户任务完成率评估，Performance trace 与数据管道日志要能对齐。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
降采样会隐藏尖峰，WebGL 也会增加可访问性与导出成本。关键异常应保留原始点，并提供表格或明细入口。
