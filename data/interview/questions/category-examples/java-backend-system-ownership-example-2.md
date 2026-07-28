---
id: java-backend-system-ownership-example-2
title: "系统出了跨团队故障时，你负责到哪一步才算闭环？"
slug: java-backend-system-ownership-example-2
tracks:
  - java-backend
category: system-ownership
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "系统职责"
  - "服务边界"
  - "依赖治理"
  - "故障闭环"
summary: "围绕系统职责的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
系统出了跨团队故障时，你负责到哪一步才算闭环？

::candidate level="deep"::
不能以“下游的问题”结束。负责人的工作包括确认用户影响、推动止血、保留证据、找到真正归属并跟进改进；但不应把别人的代码说成自己完成，要把协调责任与实现责任分开。

::interviewer::
如果继续追数字，系统职责要拿出哪组证据？

::candidate level="deep"::
接口契约、服务拓扑、代码 owner、告警路由和复盘行动项能共同证明系统边界，单靠口头范围容易把团队成果算到个人。

::interviewer::
系统职责最容易被忽略的边界是什么？

::candidate::
ownership 不是无限兜底。依赖方的 SLO、升级路径和共同演练要事先约定，否则责任只会在事故现场临时扩张。
