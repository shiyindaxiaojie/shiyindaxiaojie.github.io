---
id: devops-incident-story-example-1
title: "讲一次信息不完整的线上故障，你靠哪条证据找到突破口？"
slug: devops-incident-story-example-1
tracks:
  - devops
category: incident-story
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "故障时间线"
  - "止血决策"
  - "证据链"
  - "复盘闭环"
summary: "围绕故障时间线的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
讲一次信息不完整的线上故障，你靠哪条证据找到突破口？

::candidate level="core"::
按真实时间线讲：用户先看到什么、监控先报什么、哪条线索是噪声、哪条证据让范围突然缩小。重点不是把自己包装成英雄，而是说明如何从指标、日志、变更记录中排除错误假设，并在影响继续扩大前完成止血。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
用事故时间线对齐告警、日志、Trace、发布记录和处置动作；每个结论都应能指出当时看到的原始信号。

::interviewer::
故障时间线这段经历还有什么代价或没解决的问题？

::candidate::
事故讲得再完整，也不能把相关性当因果。若没有复现或对照证据，要明确哪些仍是假设，以及后续如何验证。
