---
id: frontend-collaboration-model-example-1
title: "怎么反问前后端协作，才能看出接口变更是不是靠群里通知？"
slug: frontend-collaboration-model-example-1
tracks:
  - frontend
category: collaboration-model
stage: reverse
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "协作模式"
  - "接口契约"
  - "设计评审"
  - "变更管理"
summary: "围绕协作模式的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
怎么反问前后端协作，才能看出接口变更是不是靠群里通知？

::candidate level="core"::
问接口是否有 schema、兼容规则、Mock、契约测试和废弃周期，再追问最近一次破坏性变更怎么处理。能给出版本、owner 和自动化证据，比“沟通很顺畅”更真实。

::interviewer::
对方只给一句标准答案时，协作模式还能追问什么证据？

::candidate level="deep"::
可信证据包括 API 变更记录、契约测试、设计评审、实验结果和复盘；会议数量不是协作质量指标。

::interviewer::
什么回答会让你继续确认协作模式的风险？

::candidate::
流程过重会拖慢小改动。团队应按风险选择同步方式，同时保持接口兼容与用户目标两条底线。
