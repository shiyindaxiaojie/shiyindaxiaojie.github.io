---
id: devops-pipeline-failure-example-1
title: "流水线卡在部署一半，怎样判断继续、重试还是回滚？"
slug: devops-pipeline-failure-example-1
tracks:
  - devops
category: pipeline-failure
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "流水线故障"
  - "部署状态"
  - "软件供应链"
  - "制品签名"
summary: "围绕流水线故障的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
流水线卡在部署一半，怎样判断继续、重试还是回滚？

::candidate level="core"::
先读取发布状态而不是盲目重跑：已部署多少实例、健康指标怎样、剩余步骤是否幂等、数据库是否已变更。影响未扩大且步骤可恢复时继续；新版本指标恶化就暂停并回滚；状态不可信时先人工核对再动作。

::interviewer::
这个流水线故障方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
发布单、流水线日志、制品摘要、目标实例和健康指标必须能对齐；供应链验证还要保留签名、SBOM 与策略拒绝记录。

::interviewer::
流水线故障发生部分失败时，系统怎样收敛？

::candidate::
自动重试可能放大非幂等步骤，自动回滚也可能碰到不可逆数据。流水线必须显式标注副作用和人工接管点。
