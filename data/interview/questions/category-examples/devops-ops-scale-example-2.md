---
id: devops-ops-scale-example-2
title: "机器和服务翻一倍，现有运维方式最先会在哪里失效？"
slug: devops-ops-scale-example-2
tracks:
  - devops
category: ops-scale
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "生产规模"
  - "自动化覆盖"
  - "配置漂移"
  - "值班负担"
summary: "围绕生产规模的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
机器和服务翻一倍，现有运维方式最先会在哪里失效？

::candidate level="deep"::
先找随规模线性甚至指数增长的工作：配置漂移、证书和密钥轮换、告警路由、容量盘点、跨集群发布。若这些动作仍依赖个人记忆，规模翻倍后最先坏的往往是协作和变更安全，而不一定是 CPU。

::interviewer::
如果继续追数字，生产规模要拿出哪组证据？

::candidate level="deep"::
可以用资产清单、发布次数、告警分布、自动化覆盖率和工单耗时交叉证明规模；单报“几百台机器”无法说明难度。

::interviewer::
生产规模最容易被忽略的边界是什么？

::candidate::
自动化覆盖率高也可能是假象。脚本失败后的人工接管、权限审计和异常分支若没被统计，规模越大，隐藏成本越高。
