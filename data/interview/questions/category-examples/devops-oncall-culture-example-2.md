---
id: devops-oncall-culture-example-2
title: "怎样判断团队在治理告警，还是把压力都压给值班人？"
slug: devops-oncall-culture-example-2
tracks:
  - devops
category: oncall-culture
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "值班文化"
  - "夜间告警"
  - "告警治理"
  - "事故复发"
summary: "围绕值班文化的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎样判断团队在治理告警，还是把压力都压给值班人？

::candidate level="deep"::
继续问告警是否有负责人和手册、重复告警多久必须治理、事故改进项由谁跟踪，以及稳定性工作占迭代多少容量。若团队只统计响应速度，却不统计复发率和告警减少量，压力大概率只是被轮流承担。

::interviewer::
对方给出哪些具体事实，才算回答了值班文化？

::candidate level="deep"::
可信回答通常能给出值班轮次、告警数量、主要故障源和最近一次治理结果；模糊口号无法形成可核验的团队证据。

::interviewer::
判断值班文化时最容易被哪个表面现象误导？

::candidate::
值班少不一定代表系统好，也可能是没有监控或问题被客户先发现。还要追问发现渠道、事故分级和用户反馈如何进入复盘。
