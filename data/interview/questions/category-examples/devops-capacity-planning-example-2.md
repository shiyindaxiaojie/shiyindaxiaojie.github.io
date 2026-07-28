---
id: devops-capacity-planning-example-2
title: "压测结果很好，上线仍然扛不住，通常漏算了什么？"
slug: devops-capacity-planning-example-2
tracks:
  - devops
category: capacity-planning
stage: scenario
difficulty: senior
questionType: system-design
frequency: high
tags:
  - "容量规划"
  - "峰值流量"
  - "压测"
  - "安全水位"
summary: "围绕容量规划的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
压测结果很好，上线仍然扛不住，通常漏算了什么？

::candidate level="deep"::
实验室压测常漏掉热点键、真实数据分布、缓存冷启动、下游限额、日志 I/O 和重试风暴。还要看持续压测后的 GC、连接池和队列水位，短时间峰值通过不等于能稳定跑一天。

::interviewer::
如果现场验证这项容量规划判断，先看哪些指标或日志？

::candidate level="deep"::
容量模型要能用线上 QPS、P99、饱和度和单实例吞吐回算，并通过分层压测与一次缩容演练校准。

::interviewer::
流量或数据规模翻倍后，哪个假设最先失效？

::candidate::
按平均值算容量会系统性低估风险。突发流量、单可用区故障和扩容冷却时间都要进模型，且模型需定期用真实指标修正。
