---
id: rag-chunking-strategy
title: RAG 里的切块策略为什么会直接影响召回质量？
slug: rag-chunking-strategy
tracks:
  - ai-agent
category: llm
difficulty: intermediate
questionType: principle
frequency: high
tags:
  - rag
  - chunking
  - retrieval
summary: 这是 Agent 开发工程师很爱问的一题，重点是工程权衡，而不是概念复述。
estimatedRead: 6
related:
  - prompt-hallucination-control
---

::interviewer::
RAG 里为什么切块策略会直接影响效果？

::candidate level="core"::
因为检索系统召回的是块，不是整篇文档。切块太碎会丢上下文，太大又会把噪声一起带进来，都会影响召回和生成。

::interviewer::
那你怎么决定块大小？

::candidate::
我通常会根据文档结构、问题粒度和 embedding 模型的输入特性来选。  
比如 FAQ、接口文档、技术方案、长论文，适合的切块方式完全不同。

::candidate level="deep"::
工程上不只看块大小，还看：

1. 是否保留标题层级和段落边界。
2. 是否做 overlap，避免语义被截断。
3. 召回评估是按命中率、MRR 还是最终回答准确率看。

::note::
如果只回答“切 500 字比较合适”，基本说明没有真正做过 RAG 调优。
