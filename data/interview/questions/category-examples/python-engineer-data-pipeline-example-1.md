---
id: python-engineer-data-pipeline-example-1
title: "一条 Python 数据流水线怎样保证重跑后结果不重复？"
slug: python-engineer-data-pipeline-example-1
tracks:
  - python-engineer
category: data-pipeline
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "数据处理"
  - "数据血缘"
  - "Schema 演进"
  - "幂等重跑"
summary: "围绕数据处理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一条 Python 数据流水线怎样保证重跑后结果不重复？

::candidate level="core"::
输入按分区或批次标识，转换保持确定性，输出以业务键或分区原子替换。每一步记录 checkpoint 和数据版本，失败后从安全边界恢复；副作用不能依赖“这次应该只跑一次”。

::interviewer::
这条数据处理链路上线后，用什么证据验证设计？

::candidate level="deep"::
记录批次 lineage、输入输出行数、校验失败、checkpoint 和重跑差异；关键汇总用独立查询或抽样对账。

::interviewer::
数据处理里最容易漏掉的失败分支是什么？

::candidate::
Exactly-once 常依赖局部存储语义。跨文件、数据库和 API 时，应设计幂等输出和可重算，而不是依赖单一事务。
