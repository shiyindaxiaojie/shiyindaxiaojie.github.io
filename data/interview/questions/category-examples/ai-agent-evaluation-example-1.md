---
id: ai-agent-evaluation-example-1
title: "Agent 上线前，评测集应该按什么维度拆？"
slug: ai-agent-evaluation-example-1
tracks:
  - ai-agent
category: evaluation
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Agent 评测"
  - "评测集"
  - "线上效果"
  - "模型裁判"
summary: "围绕Agent 评测的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Agent 上线前，评测集应该按什么维度拆？

::candidate level="core"::
按真实任务、难度、用户群、工具路径和失败风险分层，既保留固定回归集，也持续加入线上失败。事实正确、任务完成、引用、安全、延迟和成本分开测，避免一个总分掩盖致命退化。

::interviewer::
别停在原理上，Agent 评测落到线上先看什么证据？

::candidate level="deep"::
保存评测集版本、样本来源、人工标注一致率、裁判版本和线上任务漏斗；对分数变化做逐样本 diff。

::interviewer::
Agent 评测这套判断在哪个边界下会失效？

::candidate::
自动裁判适合规模化筛选，不适合独自裁决所有事实和安全问题。关键样本需要规则或人工校准，并监控裁判漂移。
