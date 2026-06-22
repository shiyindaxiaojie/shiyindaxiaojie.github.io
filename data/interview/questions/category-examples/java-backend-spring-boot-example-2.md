---
id: java-backend-spring-boot-example-2
title: 一个 Starter 设计不好，会给业务系统带来哪些隐性风险？
slug: java-backend-spring-boot-example-2
tracks:
  - java-backend
category: spring-boot
difficulty: senior
questionType: scenario
frequency: high
tags:
  - Spring Boot
  - 自动配置
  - Starter
  - 条件装配
summary: 从默认开关、Bean 覆盖、依赖冲突、Actuator 暴露和升级回归评估内部 starter 风险。
estimatedRead: 5
---

::interviewer::
如果让你做一个公司内部 starter，你最担心它给业务系统带来什么问题？

::candidate level="deep"::
我最担心隐式行为。业务只引一个依赖，结果多了全局过滤器、重试、线程池、序列化配置或拦截器。我的设计原则是：观测类能力可以默认打开但要低成本；会改变业务语义的能力，比如重试、降级、异常转换、幂等拦截，必须有显式开关和清晰日志。

::interviewer::
你怎么让业务方知道 starter 到底装了什么？

::candidate::
我会提供三类抓手：启动日志打印 starter 版本、关键开关和创建的核心 Bean；Actuator 能通过 `/actuator/beans`、`/actuator/configprops`、`/actuator/conditions` 查到装配结果；文档里给出最小配置和覆盖方式。否则 starter 一旦出问题，业务只能翻源码猜。

::interviewer::
依赖冲突怎么提前发现？

::candidate level="deep"::
starter 要尽量接公司 BOM，不要私自锁一堆基础库版本。发布前我会用样例应用跑 `mvn dependency:tree`，重点看日志框架、JSON、HTTP 客户端、Netty、数据库驱动这些容易冲突的依赖。遇到可选能力用 optional 或拆 starter，不要让业务为了一个功能被迫引入一串重依赖。

::interviewer::
Bean 覆盖和默认值怎么设计？

::candidate::
公共 starter 的默认 Bean 尽量用 `@ConditionalOnMissingBean`，让业务能替换。配置项要有独立前缀、默认值保守、必要时加校验。比如连接池大小、超时时间、重试次数不能给得很激进；否则 starter 一上线，可能把下游打爆或把请求拖很久。

::interviewer::
starter 升级前你会怎么做回归？

::candidate::
我会准备一个样例工程和至少一个真实业务灰度应用，比较升级前后的 conditions、beans、configprops 输出差异。再压测关键路径，看线程池、连接池、错误率和延迟有没有变化。starter 属于基础设施，升级验证不能只跑单元测试，还要看运行时装配结果有没有变。
