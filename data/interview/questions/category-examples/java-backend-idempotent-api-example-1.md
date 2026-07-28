---
id: java-backend-idempotent-api-example-1
title: "下单接口怎样做幂等，为什么只靠前端禁用按钮不够？"
slug: java-backend-idempotent-api-example-1
tracks:
  - java-backend
category: idempotent-api
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "接口幂等"
  - "幂等键"
  - "唯一约束"
  - "请求重放"
summary: "围绕接口幂等的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
下单接口怎样做幂等，为什么只靠前端禁用按钮不够？

::candidate level="core"::
客户端为一次业务意图生成幂等键，服务端把键与用户、请求摘要和业务结果绑定，并用唯一约束保证只有一次创建。前端防重挡不住超时重试、网关重放和并发请求，最终控制必须在服务端。

::interviewer::
这个接口幂等方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
压测并发相同幂等键，检查唯一约束、业务记录和返回结果；日志要能按幂等键串起首次请求、重试和最终状态。

::interviewer::
接口幂等发生部分失败时，系统怎样收敛？

::candidate::
幂等记录需要生命周期。过早过期会允许旧请求重放，永久保存又成本过高，应依据业务可重试窗口和审计要求设定。
