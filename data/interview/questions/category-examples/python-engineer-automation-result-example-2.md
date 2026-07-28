---
id: python-engineer-automation-result-example-2
title: "反问自动化平台时，怎么判断“高成功率”不是假象？"
slug: python-engineer-automation-result-example-2
tracks:
  - python-engineer
category: automation-result
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "自动化成果"
  - "人工耗时"
  - "可恢复执行"
  - "采用率"
summary: "围绕自动化成果的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
反问自动化平台时，怎么判断“高成功率”不是假象？

::candidate level="deep"::
追问成功的口径：脚本退出码为零，还是目标状态真的收敛；再问失败后的人工接管、重复执行、权限审计和脚本维护人。只报成功率却不统计异常分支，数字没有意义。

::interviewer::
如果继续追数字，自动化成果要拿出哪组证据？

::candidate level="deep"::
可信证据包括前后状态校验、失败分类、人工介入、采用率和维护成本，并能举出最近一次自动化事故。

::interviewer::
自动化成果最容易被忽略的边界是什么？

::candidate::
成功率高也可能因为复杂任务仍走人工。继续问覆盖率和被排除的高风险场景，避免被平均值误导。
