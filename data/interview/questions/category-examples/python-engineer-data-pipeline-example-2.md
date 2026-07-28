---
id: python-engineer-data-pipeline-example-2
title: "上游 schema 悄悄变化，怎么避免错误数据一路写到底？"
slug: python-engineer-data-pipeline-example-2
tracks:
  - python-engineer
category: data-pipeline
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "数据处理"
  - "数据血缘"
  - "Schema 演进"
  - "幂等重跑"
summary: "围绕数据处理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
上游 schema 悄悄变化，怎么避免错误数据一路写到底？

::candidate level="deep"::
入口做 schema 与质量校验，兼容字段显式演进，不兼容变化进入隔离区并告警。下游消费已验证版本，原始数据保留便于回放，不能把缺字段悄悄填成看似合法的默认值。

::interviewer::
这项数据处理设计怎么证明不是纸上方案？

::candidate level="deep"::
记录批次 lineage、输入输出行数、校验失败、checkpoint 和重跑差异；关键汇总用独立查询或抽样对账。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
Exactly-once 常依赖局部存储语义。跨文件、数据库和 API 时，应设计幂等输出和可重算，而不是依赖单一事务。
