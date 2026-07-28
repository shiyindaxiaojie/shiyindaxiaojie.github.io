---
id: java-backend-spring-boot-example-2
title: "一个 Starter 设计不好，会给业务系统带来哪些隐性风险？"
slug: java-backend-spring-boot-example-2
tracks:
  - java-backend
category: spring-boot
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "Spring Boot"
  - "自动配置"
  - "Starter"
  - "条件装配"
summary: "围绕Spring Boot的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
一个 Starter 设计不好，会给业务系统带来哪些隐性风险？

::candidate level="deep"::
隐式 Bean、过宽的 component scan、默认开启外部连接、依赖版本泄漏和难以覆盖的配置，都会让引包产生副作用。好的 Starter 暴露清晰属性、按条件创建、允许业务覆盖，并在禁用后不残留线程或资源。

::interviewer::
如果现场现象和预期不一致，Spring Boot怎么继续缩小范围？

::candidate level="deep"::
用条件评估报告、Actuator beans/configprops、启动日志和依赖树确认配置来源；冲突时记录最终 Bean 与属性绑定结果。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
自动配置的默认值必须保守。若引包就启动定时任务或连接生产资源，测试与多模块应用会出现难以察觉的副作用。
