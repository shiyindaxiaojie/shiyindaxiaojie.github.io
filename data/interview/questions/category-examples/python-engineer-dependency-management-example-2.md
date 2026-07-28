---
id: python-engineer-dependency-management-example-2
title: "反问 Python 依赖治理时，怎样看出团队不是等漏洞爆发才升级？"
slug: python-engineer-dependency-management-example-2
tracks:
  - python-engineer
category: dependency-management
stage: reverse
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "依赖治理"
  - "锁文件"
  - "供应链安全"
  - "版本升级"
summary: "围绕依赖治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
反问 Python 依赖治理时，怎样看出团队不是等漏洞爆发才升级？

::candidate level="deep"::
问依赖更新节奏、锁文件和 SBOM 谁维护、高危漏洞的响应时限，以及最近一次破坏性升级怎样灰度。能说明日常小步更新和例外处理，才不是临时救火。

::interviewer::
如果现场验证这项依赖治理判断，先看哪些指标或日志？

::candidate level="deep"::
可信回答会给出扫描、更新 PR、测试门禁、生产制品追溯和漏洞 SLA，而不是只说“定期升级”。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
自动更新数量多不代表治理好。还要确认失败回滚、弃用计划和无人维护依赖的替换机制。
