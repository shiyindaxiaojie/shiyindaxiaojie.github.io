---
id: frontend-ux-impact-example-2
title: "页面指标变好了，但用户投诉没减少，你会怎么解释？"
slug: frontend-ux-impact-example-2
tracks:
  - frontend
category: ux-impact
stage: intro
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "体验指标"
  - "用户任务"
  - "A/B 实验"
  - "用户反馈"
summary: "围绕体验指标的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
页面指标变好了，但用户投诉没减少，你会怎么解释？

::candidate level="deep"::
性能或转化只是局部信号。投诉可能来自文案、业务规则、少数设备或异常分支；需要按用户、浏览器、网络和流程步骤切片，并核对投诉分类与会话回放。

::interviewer::
如果继续追数字，体验指标要拿出哪组证据？

::candidate level="deep"::
把埋点口径、实验分组、RUM、错误上报和用户反馈对齐，检查样本量与发布时间，避免只挑好看的区间。

::interviewer::
体验指标最容易被忽略的边界是什么？

::candidate::
可观测不等于过度采集。用户隐私、敏感字段和录屏范围要受控，指标设计必须同时满足合规边界。
