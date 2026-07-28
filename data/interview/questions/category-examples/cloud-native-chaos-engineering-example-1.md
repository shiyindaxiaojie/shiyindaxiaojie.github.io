---
id: cloud-native-chaos-engineering-example-1
title: "第一次做混沌演练，为什么不能直接从“随机杀 Pod”开始？"
slug: cloud-native-chaos-engineering-example-1
tracks:
  - cloud-native
category: chaos-engineering
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "混沌工程"
  - "稳态假设"
  - "故障注入"
  - "爆炸半径"
summary: "围绕混沌工程的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
第一次做混沌演练，为什么不能直接从“随机杀 Pod”开始？

::candidate level="core"::
先写稳态假设：哪项用户指标在故障下仍要保持，再选择能验证假设的最小故障。明确范围、持续时间、停止条件和观察人，从测试环境到单实例逐步扩大；随机破坏但没有假设，只是在赌系统会不会出事。

::interviewer::
这条混沌工程链路上线后，用什么证据验证设计？

::candidate level="deep"::
保留实验配置、影响范围、SLI 曲线、告警时间和恢复步骤；修复后用同一实验复跑，结果才可比较。

::interviewer::
混沌工程里最容易漏掉的失败分支是什么？

::candidate::
生产演练的安全边界包括实时停止、 blast radius、依赖方通知和禁止时段。自动化越强，权限与审计越重要。
