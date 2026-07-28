---
id: ai-agent-rag-quality-example-1
title: "RAG 答案错了，怎么分辨是没召回、排错序还是模型没用证据？"
slug: ai-agent-rag-quality-example-1
tracks:
  - ai-agent
category: rag-quality
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "RAG 质量"
  - "召回排序"
  - "混合检索"
  - "引用正确率"
summary: "围绕RAG 质量的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
RAG 答案错了，怎么分辨是没召回、排错序还是模型没用证据？

::candidate level="core"::
先看正确证据是否在候选集：不在就查切块、查询改写和召回；在但排名低就查 reranker；已进入上下文却没被引用，再查 Prompt、冲突证据和模型。分阶段指标能避免靠调一个总分碰运气。

::interviewer::
这个RAG 质量方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
离线记录 recall@k、nDCG、引用正确率和阶段延迟，线上保存候选、分数、版本与用户反馈，失败样本可重放。

::interviewer::
RAG 质量发生部分失败时，系统怎样收敛？

::candidate::
评测问题若和文档切块共享措辞，会高估召回。要加入同义表达、无答案、冲突版本和权限过滤样本。
