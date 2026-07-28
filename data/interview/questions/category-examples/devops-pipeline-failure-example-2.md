---
id: devops-pipeline-failure-example-2
title: "构建成功但生产制品不可信，软件供应链要补哪几环？"
slug: devops-pipeline-failure-example-2
tracks:
  - devops
category: pipeline-failure
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "流水线故障"
  - "部署状态"
  - "软件供应链"
  - "制品签名"
summary: "围绕流水线故障的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
构建成功但生产制品不可信，软件供应链要补哪几环？

::candidate level="deep"::
从受控源码和锁定依赖开始，构建环境要可复现，产物生成 SBOM 并签名，入库后以 digest 提升到各环境。部署侧验证签名和策略，审计记录要能回答谁在何时把哪个产物放到了哪里。

::interviewer::
如果现场验证这项流水线故障判断，先看哪些指标或日志？

::candidate level="deep"::
发布单、流水线日志、制品摘要、目标实例和健康指标必须能对齐；供应链验证还要保留签名、SBOM 与策略拒绝记录。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
自动重试可能放大非幂等步骤，自动回滚也可能碰到不可逆数据。流水线必须显式标注副作用和人工接管点。
