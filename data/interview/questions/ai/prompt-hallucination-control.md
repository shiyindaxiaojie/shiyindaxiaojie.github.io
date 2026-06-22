---
id: prompt-hallucination-control
title: 怎么通过 Prompt 和系统设计一起控制大模型幻觉？
slug: prompt-hallucination-control
tracks:
  - ai-agent
category: prompt
difficulty: senior
questionType: scenario
frequency: high
tags:
  - prompt
  - hallucination
  - evaluation
summary: 这题的关键是把 prompt、检索、拒答和离线评估放到一条链路里讲。
estimatedRead: 6
related:
  - rag-chunking-strategy
---

::interviewer::
怎么控制大模型幻觉？

::candidate level="core"::
我不会把它只当成 Prompt 问题，而是把它看成“输入约束 + 外部证据 + 输出校验”的系统问题。

::interviewer::
先说 Prompt 层面。

::candidate::
Prompt 层面我会明确回答边界，比如：

1. 没有证据时允许拒答。
2. 回答时要求引用检索片段。
3. 对高风险问题使用固定输出模板。

::candidate level="deep"::
真正落地还要配系统设计：

1. 用 RAG 给模型提供可追溯证据。
2. 对关键字段做规则或模型二次校验。
3. 建立离线评测集和线上抽检，持续量化幻觉率。

::note::
如果回答只停在“把 Prompt 写严格一点”，一般拿不到高分。
