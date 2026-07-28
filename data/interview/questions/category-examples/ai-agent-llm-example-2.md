---
id: ai-agent-llm-example-2
title: "上下文越长，答案就一定越好吗？"
slug: ai-agent-llm-example-2
tracks:
  - ai-agent
category: llm
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "LLM / RAG"
  - "检索质量"
  - "上下文"
  - "答案引用"
summary: "围绕LLM / RAG的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
上下文越长，答案就一定越好吗？

::candidate level="deep"::
上下文变长会增加成本和延迟，也可能引入冲突、噪声和位置偏差。应按问题选择少量高价值证据，去重并保留来源；缺证据时允许拒答，而不是把更多文本塞进去赌模型会找。

::interviewer::
如果现场现象和预期不一致，LLM / RAG怎么继续缩小范围？

::candidate level="deep"::
保存 query、召回候选、rerank 分数、最终上下文、模型版本和答案引用，用分阶段评测与 Trace 重放失败样本。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
模型参数和检索索引都会变化。没有版本快照的线上答案无法复现，评测结果也不能跨版本直接比较。
