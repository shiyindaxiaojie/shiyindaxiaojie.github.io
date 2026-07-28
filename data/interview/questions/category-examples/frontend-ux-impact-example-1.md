---
id: frontend-ux-impact-example-1
title: "一次交互优化究竟帮了用户什么，怎么量化？"
slug: frontend-ux-impact-example-1
tracks:
  - frontend
category: ux-impact
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "体验指标"
  - "用户任务"
  - "A/B 实验"
  - "用户反馈"
summary: "围绕体验指标的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一次交互优化究竟帮了用户什么，怎么量化？

::candidate level="core"::
先定义用户任务和摩擦点，再选择贴近任务的指标：完成率、耗时、错误恢复、放弃率或可访问性，而不是只报点击量。改动前后用同口径数据，补充访谈或回放解释数字背后的行为。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
把埋点口径、实验分组、RUM、错误上报和用户反馈对齐，检查样本量与发布时间，避免只挑好看的区间。

::interviewer::
体验指标这段经历还有什么代价或没解决的问题？

::candidate::
可观测不等于过度采集。用户隐私、敏感字段和录屏范围要受控，指标设计必须同时满足合规边界。
