---
id: devops-ops-scale-example-1
title: "你维护过的最大生产环境是什么规模，复杂度主要来自哪里？"
slug: devops-ops-scale-example-1
tracks:
  - devops
category: ops-scale
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "生产规模"
  - "自动化覆盖"
  - "配置漂移"
  - "值班负担"
summary: "围绕生产规模的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
你维护过的最大生产环境是什么规模，复杂度主要来自哪里？

::candidate level="core"::
规模不要只报机器数。服务数量、集群和地域、日常变更量、峰值流量、告警量以及值班人数，合在一起才说明运维复杂度。接着挑一个真正受规模影响的环节，讲清自己如何把手工判断变成标准或自动化。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
可以用资产清单、发布次数、告警分布、自动化覆盖率和工单耗时交叉证明规模；单报“几百台机器”无法说明难度。

::interviewer::
生产规模这段经历还有什么代价或没解决的问题？

::candidate::
自动化覆盖率高也可能是假象。脚本失败后的人工接管、权限审计和异常分支若没被统计，规模越大，隐藏成本越高。
