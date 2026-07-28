---
id: cloud-native-traffic-governance-example-1
title: "超时、重试、熔断和限流应该按什么顺序设计？"
slug: cloud-native-traffic-governance-example-1
tracks:
  - cloud-native
category: traffic-governance
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "流量治理"
  - "超时重试"
  - "熔断限流"
  - "灰度路由"
summary: "围绕流量治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
超时、重试、熔断和限流应该按什么顺序设计？

::candidate level="core"::
先给整条调用链一个总时间预算，再向下游分配超时；只对幂等且有剩余预算的失败做有限重试，并加退避和抖动。并发或错误超过下游承载时用限流与熔断隔离，避免重试把小故障放大。

::interviewer::
这个流量治理方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
看每一跳超时、重试次数、熔断状态、限流拒绝和版本切片指标，Trace 要能显示一次请求实际被放大了多少次。

::interviewer::
流量治理发生部分失败时，系统怎样收敛？

::candidate::
非幂等请求不能无条件重试，限流也不能只保护入口。最脆弱的下游和共享资源才决定整条链路的边界。
