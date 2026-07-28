---
id: devops-capacity-planning-example-1
title: "业务说下月峰值翻三倍，怎么把容量估算落到机器数？"
slug: devops-capacity-planning-example-1
tracks:
  - devops
category: capacity-planning
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "容量规划"
  - "峰值流量"
  - "压测"
  - "安全水位"
summary: "围绕容量规划的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
业务说下月峰值翻三倍，怎么把容量估算落到机器数？

::candidate level="core"::
先用业务量换算入口 QPS，再乘请求扇出、重试和峰值系数得到各依赖负载。用压测找单实例在目标延迟和错误率下的安全吞吐，而不是极限吞吐，最后加入故障冗余、扩容耗时和增长缓冲。

::interviewer::
这个容量规划方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
容量模型要能用线上 QPS、P99、饱和度和单实例吞吐回算，并通过分层压测与一次缩容演练校准。

::interviewer::
容量规划发生部分失败时，系统怎样收敛？

::candidate::
按平均值算容量会系统性低估风险。突发流量、单可用区故障和扩容冷却时间都要进模型，且模型需定期用真实指标修正。
