---
id: ai-agent-knowledge-assistant-example-2
title: "文档更新后，怎样确认旧答案不会继续被检索出来？"
slug: ai-agent-knowledge-assistant-example-2
tracks:
  - ai-agent
category: knowledge-assistant
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "知识助手"
  - "文档 ACL"
  - "索引更新"
  - "数据血缘"
summary: "围绕知识助手的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
文档更新后，怎样确认旧答案不会继续被检索出来？

::candidate level="deep"::
内容发布产生新版本并让旧版本失效，增量索引记录源版本和更新时间。用删除/更新回归样本检查召回，监控源到索引的延迟；缓存和向量索引都要参与失效。

::interviewer::
这项知识助手设计怎么证明不是纸上方案？

::candidate level="deep"::
审计用户、查询、候选文档权限、最终引用、索引版本和拒绝原因，定期做跨权限越权测试。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
文档级权限可能在切块和摘要后丢失。所有派生数据都要保留 lineage 与最严格来源权限，删除也必须级联。
