---
id: cicd-blue-green-rollout
title: 蓝绿发布和金丝雀发布应该怎么选？
slug: cicd-blue-green-rollout
tracks:
  - cloud-native
  - devops
category: cicd
stage: scenario
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - cicd
  - release
  - canary
summary: 面试官通常想听的不只是定义，而是风险、回滚和观测窗口怎么取舍。
estimatedRead: 5
related:
  - k8s-readiness-liveness
---

::interviewer::
蓝绿发布和金丝雀发布怎么选？

::candidate level="core"::
如果我更看重快速整体切换和一键回滚，倾向蓝绿；如果我更看重逐步放量和风险控制，倾向金丝雀。

::interviewer::
为什么很多团队明明有金丝雀能力，还是常用蓝绿？

::candidate::
因为不是所有链路都适合细粒度放量。  
如果数据库变更不兼容、状态共享复杂、流量切分不可控，蓝绿反而更容易保证切换的一致性。

::candidate level="deep"::
真正选择时我会看四件事：

1. 回滚速度要求。
2. 数据库兼容窗口。
3. 流量观测是否足够细。
4. 业务是否允许小流量试错。

::note::
这题没有绝对标准答案，但一定要体现“选择取决于系统约束”，而不是背定义。
