---
id: devops-automation-level-example-1
title: "怎么判断团队的自动化不是一堆没人维护的脚本？"
slug: devops-automation-level-example-1
tracks:
  - devops
category: automation-level
stage: reverse
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "自动化程度"
  - "平台采用率"
  - "自助交付"
  - "维护成本"
summary: "围绕自动化程度的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎么判断团队的自动化不是一堆没人维护的脚本？

::candidate level="core"::
问三件事：最常见的生产操作有多少走统一入口，失败后谁维护，最近一次自动化事故怎么复盘。真正的平台会有版本、测试、权限、审计和使用指标；散落脚本通常只有作者知道前置条件。

::interviewer::
对方只给一句标准答案时，自动化程度还能追问什么证据？

::candidate level="deep"::
让对方举一个端到端流程，从申请资源到上线与回收，观察是否有审计日志、失败率、维护人和用户反馈，而不是只数工具数量。

::interviewer::
什么回答会让你继续确认自动化程度的风险？

::candidate::
统一平台也可能变成新的单点瓶颈。反问时要确认逃生通道、扩展机制和故障时的人工接管，而不是默认自动化越多越好。
