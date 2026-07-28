---
id: cloud-native-chaos-engineering-example-2
title: "一次混沌实验怎样判断发现了真实风险，而不是制造热闹？"
slug: cloud-native-chaos-engineering-example-2
tracks:
  - cloud-native
category: chaos-engineering
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "混沌工程"
  - "稳态假设"
  - "故障注入"
  - "爆炸半径"
summary: "围绕混沌工程的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一次混沌实验怎样判断发现了真实风险，而不是制造热闹？

::candidate level="deep"::
实验要让某个控制失效并暴露可复现证据，例如故障转移超过目标、告警没触发或重试放大。随后创建修复项并复测；如果只记录“服务自动恢复”，没有验证 SLO，就没有新信息。

::interviewer::
这项混沌工程设计怎么证明不是纸上方案？

::candidate level="deep"::
保留实验配置、影响范围、SLI 曲线、告警时间和恢复步骤；修复后用同一实验复跑，结果才可比较。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
生产演练的安全边界包括实时停止、 blast radius、依赖方通知和禁止时段。自动化越强，权限与审计越重要。
