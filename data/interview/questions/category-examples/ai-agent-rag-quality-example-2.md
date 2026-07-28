---
id: ai-agent-rag-quality-example-2
title: "知识库规模翻十倍，怎样守住召回质量和延迟？"
slug: ai-agent-rag-quality-example-2
tracks:
  - ai-agent
category: rag-quality
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "RAG 质量"
  - "召回排序"
  - "混合检索"
  - "引用正确率"
summary: "围绕RAG 质量的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
知识库规模翻十倍，怎样守住召回质量和延迟？

::candidate level="deep"::
按领域和权限缩小搜索空间，混合稀疏/向量召回后用轻量重排，限制候选与上下文预算。索引分片和缓存要以真实查询分布验证，不能用扩大 top_k 换质量。

::interviewer::
如果现场验证这项RAG 质量判断，先看哪些指标或日志？

::candidate level="deep"::
离线记录 recall@k、nDCG、引用正确率和阶段延迟，线上保存候选、分数、版本与用户反馈，失败样本可重放。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
评测问题若和文档切块共享措辞，会高估召回。要加入同义表达、无答案、冲突版本和权限过滤样本。
