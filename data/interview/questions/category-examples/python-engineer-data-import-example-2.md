---
id: python-engineer-data-import-example-2
title: "导入到 70% 失败，重试时从头开始还是继续？"
slug: python-engineer-data-import-example-2
tracks:
  - python-engineer
category: data-import
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "数据导入"
  - "流式处理"
  - "批量写入"
  - "断点续传"
summary: "围绕数据导入的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
导入到 70% 失败，重试时从头开始还是继续？

::candidate level="deep"::
按分片或批次保存 checkpoint，已提交批次用导入任务 ID 和业务键保证幂等。格式或规则变化导致全局不可信时从头重算，瞬时数据库失败则从最近安全批次继续。

::interviewer::
如果现场验证这项数据导入判断，先看哪些指标或日志？

::candidate level="deep"::
记录解析、校验、写入各阶段耗时、批次行数、失败样本和数据库负载；用同一文件重跑验证无重复。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
逐行返回全部错误可能耗尽内存和让用户无法处理。应限制示例数量、提供错误文件，并明确部分成功还是全量回滚语义。
