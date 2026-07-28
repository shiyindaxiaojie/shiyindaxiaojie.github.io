---
id: frontend-collaboration-model-example-2
title: "设计稿频繁变化时，团队怎样决定继续迭代还是收敛？"
slug: frontend-collaboration-model-example-2
tracks:
  - frontend
category: collaboration-model
stage: reverse
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "协作模式"
  - "接口契约"
  - "设计评审"
  - "变更管理"
summary: "围绕协作模式的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
设计稿频繁变化时，团队怎样决定继续迭代还是收敛？

::candidate level="deep"::
可以问谁定义用户目标、何时做可用性验证、变更成本怎样可视化，以及上线后数据由谁复盘。成熟协作不是不变，而是每次变化都有依据和停止条件。

::interviewer::
对方给出哪些具体事实，才算回答了协作模式？

::candidate level="deep"::
可信证据包括 API 变更记录、契约测试、设计评审、实验结果和复盘；会议数量不是协作质量指标。

::interviewer::
判断协作模式时最容易被哪个表面现象误导？

::candidate::
流程过重会拖慢小改动。团队应按风险选择同步方式，同时保持接口兼容与用户目标两条底线。
