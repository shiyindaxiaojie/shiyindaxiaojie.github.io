---
id: devops-incident-management-example-1
title: "一次 P1 事故里，谁有权止血，谁负责记录决策？"
slug: devops-incident-management-example-1
tracks:
  - devops
category: incident-management
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "事故管理"
  - "应急指挥"
  - "复盘改进"
  - "平均恢复时间"
summary: "围绕事故管理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一次 P1 事故里，谁有权止血，谁负责记录决策？

::candidate level="core"::
现场需要一个 Incident Commander 统一优先级，一个操作角色执行变更，一个记录角色维护时间线；专家提供判断但不应多人同时下命令。止血权和升级路径在事故前写清，才不会在高压下争论组织关系。

::interviewer::
这条事故管理链路上线后，用什么证据验证设计？

::candidate level="deep"::
复盘证据包括分钟级时间线、用户影响、关键决策、告警与操作记录；MTTD、MTTA、MTTR 只用于找流程瓶颈，不用于追责个人。

::interviewer::
事故管理里最容易漏掉的失败分支是什么？

::candidate::
流程角色过多会拖慢小事故。应按严重级别启用不同编制，同时保留任何人可升级、单一指挥和操作留痕三条底线。
