---
id: python-engineer-automation-platform-example-2
title: "平台允许团队上传脚本后，怎么隔离权限和资源？"
slug: python-engineer-automation-platform-example-2
tracks:
  - python-engineer
category: automation-platform
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "自动化平台"
  - "任务治理"
  - "沙箱隔离"
  - "审计"
summary: "围绕自动化平台的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
平台允许团队上传脚本后，怎么隔离权限和资源？

::candidate level="deep"::
每个任务使用短期身份和最小权限，在容器或沙箱限制 CPU、内存、网络与文件，密钥按任务注入且不落日志。审批、配额和审计按环境分级，高风险动作还要有 dry-run。

::interviewer::
这项自动化平台设计怎么证明不是纸上方案？

::candidate level="deep"::
用任务成功率、等待时间、人工介入、资源使用、权限拒绝和审计日志验证，按脚本版本可重放失败。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
沙箱降低但不能消除风险。网络目标、供应链依赖和数据导出仍需策略控制，并提供紧急停机。
