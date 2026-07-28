---
id: java-backend-stability-standard-example-2
title: "团队说可用性四个九，接下来最值得追问什么？"
slug: java-backend-stability-standard-example-2
tracks:
  - java-backend
category: stability-standard
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "稳定性要求"
  - "可用性"
  - "错误预算"
  - "SLI/SLO"
summary: "围绕稳定性要求的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
团队说可用性四个九，接下来最值得追问什么？

::candidate level="deep"::
继续问统计口径、排除项、依赖是否计入、数据从哪里来，以及四个九对应多少分钟故障。再问达到目标后是否仍有局部租户或关键交易被平均值掩盖。

::interviewer::
对方给出哪些具体事实，才算回答了稳定性要求？

::candidate level="deep"::
可信回答能展示 SLO 仪表盘、事故记录、错误预算和发布策略之间的联系，而不是只报一个可用率数字。

::interviewer::
判断稳定性要求时最容易被哪个表面现象误导？

::candidate::
越高的可用性成本越高，也可能拖慢变化。关键是按业务等级分层，并明确哪些降级仍算服务可用。
