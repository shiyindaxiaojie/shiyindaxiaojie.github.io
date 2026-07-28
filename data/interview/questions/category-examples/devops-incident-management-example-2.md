---
id: devops-incident-management-example-2
title: "事故复盘怎样从一份文档变成能验收的改进项？"
slug: devops-incident-management-example-2
tracks:
  - devops
category: incident-management
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "事故管理"
  - "应急指挥"
  - "复盘改进"
  - "平均恢复时间"
summary: "围绕事故管理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
事故复盘怎样从一份文档变成能验收的改进项？

::candidate level="deep"::
每个改进项要对应事故中的一个失效控制，写清负责人、截止时间和验收证据。修代码、补监控、改流程分开跟踪；到期后用演练或历史数据验证，不是勾选“已完成”就闭环。

::interviewer::
这项事故管理设计怎么证明不是纸上方案？

::candidate level="deep"::
复盘证据包括分钟级时间线、用户影响、关键决策、告警与操作记录；MTTD、MTTA、MTTR 只用于找流程瓶颈，不用于追责个人。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
流程角色过多会拖慢小事故。应按严重级别启用不同编制，同时保留任何人可升级、单一指挥和操作留痕三条底线。
