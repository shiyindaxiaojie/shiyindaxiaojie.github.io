---
id: cloud-native-disaster-recovery-example-2
title: "RPO 和 RTO 定下来后，怎么反推数据与应用方案？"
slug: cloud-native-disaster-recovery-example-2
tracks:
  - cloud-native
category: disaster-recovery
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "容灾恢复"
  - "RPO/RTO 指标"
  - "跨地域"
  - "切换演练"
summary: "围绕容灾恢复的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
RPO 和 RTO 定下来后，怎么反推数据与应用方案？

::candidate level="deep"::
RPO 决定允许丢多少数据，从而约束同步、异步复制或业务补偿；RTO 决定检测、决策和恢复必须多快，从而约束热备程度与自动化。两者越接近零，成本和耦合越高。

::interviewer::
如果现场验证这项容灾恢复判断，先看哪些指标或日志？

::candidate level="deep"::
每次演练记录故障发现、决策、流量收敛、数据追平和业务恢复时间，并核对关键交易的一致性与补偿日志。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
控制面、身份系统或 DNS 可能成为跨地域共享单点。容灾设计要逐项检查依赖是否真的隔离，而不是只复制业务 Pod。
