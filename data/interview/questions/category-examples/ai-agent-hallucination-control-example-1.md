---
id: ai-agent-hallucination-control-example-1
title: "模型没有足够证据时，系统怎样让它承认不知道？"
slug: ai-agent-hallucination-control-example-1
tracks:
  - ai-agent
category: hallucination-control
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "幻觉控制"
  - "拒答"
  - "引用校验"
  - "事实核验"
summary: "围绕幻觉控制的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
模型没有足够证据时，系统怎样让它承认不知道？

::candidate level="core"::
先在检索层判断证据覆盖和冲突，再在 Prompt 中要求只基于给定来源作答并允许拒答。输出经过事实与引用校验，高风险场景还要人工确认；不能只靠一句“不要幻觉”。

::interviewer::
这个幻觉控制方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
评测分别统计有答案正确率、无答案拒答率、引用支持率和过度拒答，线上保留证据与模型版本做复盘。

::interviewer::
幻觉控制发生部分失败时，系统怎样收敛？

::candidate::
拒答阈值越高，幻觉少但可用性也下降。不同风险任务应使用不同阈值与升级路径，不能用一个分数覆盖全部。
