---
id: devops-incident-story-example-2
title: "事故止血以后，你改了什么，怎么确认同类问题不会原样再来？"
slug: devops-incident-story-example-2
tracks:
  - devops
category: incident-story
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "故障时间线"
  - "止血决策"
  - "证据链"
  - "复盘闭环"
summary: "围绕故障时间线的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
事故止血以后，你改了什么，怎么确认同类问题不会原样再来？

::candidate level="deep"::
复盘要落到机制变化。例如补一条能提前发现问题的 SLI、缩小灰度批次、给高风险命令加双人确认，或让回滚不再依赖某个人。改进项要有负责人、截止时间和验收方式，不能停在“加强关注”。

::interviewer::
如果继续追数字，故障时间线要拿出哪组证据？

::candidate level="deep"::
用事故时间线对齐告警、日志、Trace、发布记录和处置动作；每个结论都应能指出当时看到的原始信号。

::interviewer::
故障时间线最容易被忽略的边界是什么？

::candidate::
事故讲得再完整，也不能把相关性当因果。若没有复现或对照证据，要明确哪些仍是假设，以及后续如何验证。
