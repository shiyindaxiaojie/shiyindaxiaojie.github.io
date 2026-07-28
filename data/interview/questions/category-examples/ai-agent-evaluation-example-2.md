---
id: ai-agent-evaluation-example-2
title: "离线分数变高，线上任务成功率却下降，可能漏了什么？"
slug: ai-agent-evaluation-example-2
tracks:
  - ai-agent
category: evaluation
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Agent 评测"
  - "评测集"
  - "线上效果"
  - "模型裁判"
summary: "围绕Agent 评测的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
离线分数变高，线上任务成功率却下降，可能漏了什么？

::candidate level="deep"::
离线样本可能不代表线上分布，裁判偏好与用户目标也可能不同；线上还多了延迟、工具错误、交互澄清和中断。先对齐同一版本与人群，再检查采样、指标代理和链路差异。

::interviewer::
如果现场现象和预期不一致，Agent 评测怎么继续缩小范围？

::candidate level="deep"::
保存评测集版本、样本来源、人工标注一致率、裁判版本和线上任务漏斗；对分数变化做逐样本 diff。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
自动裁判适合规模化筛选，不适合独自裁决所有事实和安全问题。关键样本需要规则或人工校准，并监控裁判漂移。
