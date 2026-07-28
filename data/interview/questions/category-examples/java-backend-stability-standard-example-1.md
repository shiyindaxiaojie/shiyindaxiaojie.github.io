---
id: java-backend-stability-standard-example-1
title: "怎么反问稳定性要求，才能知道团队真正守什么底线？"
slug: java-backend-stability-standard-example-1
tracks:
  - java-backend
category: stability-standard
stage: reverse
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "稳定性要求"
  - "可用性"
  - "错误预算"
  - "SLI/SLO"
summary: "围绕稳定性要求的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎么反问稳定性要求，才能知道团队真正守什么底线？

::candidate level="core"::
问核心用户旅程的 SLI、错误预算如何使用、最近一次越线发生了什么，以及谁能暂停发布。稳定性若只是一张年度目标，没有日常决策权，就很难约束交付。

::interviewer::
对方只给一句标准答案时，稳定性要求还能追问什么证据？

::candidate level="deep"::
可信回答能展示 SLO 仪表盘、事故记录、错误预算和发布策略之间的联系，而不是只报一个可用率数字。

::interviewer::
什么回答会让你继续确认稳定性要求的风险？

::candidate::
越高的可用性成本越高，也可能拖慢变化。关键是按业务等级分层，并明确哪些降级仍算服务可用。
