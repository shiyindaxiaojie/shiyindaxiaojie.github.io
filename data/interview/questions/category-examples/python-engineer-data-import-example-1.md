---
id: python-engineer-data-import-example-1
title: "用户导入一百万行数据，怎样既快又能指出具体错误？"
slug: python-engineer-data-import-example-1
tracks:
  - python-engineer
category: data-import
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "数据导入"
  - "流式处理"
  - "批量写入"
  - "断点续传"
summary: "围绕数据导入的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
用户导入一百万行数据，怎样既快又能指出具体错误？

::candidate level="core"::
上传后异步处理，先校验文件与 schema，再流式解析、分批校验和批量写入。错误按行号与字段输出，超过阈值可提前终止；在线请求只返回任务 ID，不能占住进程等待全量完成。

::interviewer::
这个数据导入方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
记录解析、校验、写入各阶段耗时、批次行数、失败样本和数据库负载；用同一文件重跑验证无重复。

::interviewer::
数据导入发生部分失败时，系统怎样收敛？

::candidate::
逐行返回全部错误可能耗尽内存和让用户无法处理。应限制示例数量、提供错误文件，并明确部分成功还是全量回滚语义。
