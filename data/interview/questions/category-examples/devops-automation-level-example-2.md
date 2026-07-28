---
id: devops-automation-level-example-2
title: "想了解平台工程投入，哪些问题比“自动化程度高吗”更有效？"
slug: devops-automation-level-example-2
tracks:
  - devops
category: automation-level
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "自动化程度"
  - "平台采用率"
  - "自助交付"
  - "维护成本"
summary: "围绕自动化程度的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
想了解平台工程投入，哪些问题比“自动化程度高吗”更有效？

::candidate level="deep"::
可以问新服务从仓库到可发布要多久、开发者需要提多少工单、平台团队看哪些采用率和交付指标、业务能否贡献扩展。答案能说明自动化是在消除等待，还是只把工单换成另一个表单。

::interviewer::
对方给出哪些具体事实，才算回答了自动化程度？

::candidate level="deep"::
让对方举一个端到端流程，从申请资源到上线与回收，观察是否有审计日志、失败率、维护人和用户反馈，而不是只数工具数量。

::interviewer::
判断自动化程度时最容易被哪个表面现象误导？

::candidate::
统一平台也可能变成新的单点瓶颈。反问时要确认逃生通道、扩展机制和故障时的人工接管，而不是默认自动化越多越好。
