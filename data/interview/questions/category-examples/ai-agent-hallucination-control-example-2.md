---
id: ai-agent-hallucination-control-example-2
title: "答案带引用就一定可靠吗，怎么验证引用真的支持结论？"
slug: ai-agent-hallucination-control-example-2
tracks:
  - ai-agent
category: hallucination-control
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "幻觉控制"
  - "拒答"
  - "引用校验"
  - "事实核验"
summary: "围绕幻觉控制的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
答案带引用就一定可靠吗，怎么验证引用真的支持结论？

::candidate level="deep"::
把答案拆成可核验声明，检查每条声明是否被引用片段直接支持，来源是否权威且当前有效。引用存在但只相关、不蕴含结论，仍属于无依据回答。

::interviewer::
如果现场验证这项幻觉控制判断，先看哪些指标或日志？

::candidate level="deep"::
评测分别统计有答案正确率、无答案拒答率、引用支持率和过度拒答，线上保留证据与模型版本做复盘。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
拒答阈值越高，幻觉少但可用性也下降。不同风险任务应使用不同阈值与升级路径，不能用一个分数覆盖全部。
