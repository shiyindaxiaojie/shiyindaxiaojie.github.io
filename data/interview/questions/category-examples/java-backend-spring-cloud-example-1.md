---
id: java-backend-spring-cloud-example-1
title: Spring Cloud 里的服务治理不只是注册发现，还包括什么？
slug: java-backend-spring-cloud-example-1
tracks:
  - java-backend
category: spring-cloud
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - Spring Cloud
  - 服务注册发现
  - 熔断降级
  - 配置中心
summary: 从注册中心、Actuator、调用链、配置中心和网关日志排查服务治理问题。
estimatedRead: 5
---

::interviewer::
你理解的服务治理，除了注册发现还包括什么？

::candidate level="core"::
注册发现只解决“服务在哪里”。真正的治理还包括负载均衡、超时、重试、熔断、限流、配置中心、灰度发布、网关路由和链路追踪。一个服务能被发现，不代表它健康、调用合理，也不代表故障不会扩散。

::interviewer::
线上调用某个服务一直失败，但注册中心看实例还在，你怎么查？

::candidate::
我会按链路查。先看注册中心里实例状态和更新时间，再直接访问实例的 `/actuator/health`，确认实例自己是否健康。然后查调用方日志、网关日志和 traceId，看失败发生在连接、超时、业务异常还是熔断。必要时从调用方机器 `curl http://host:port/actuator/health` 或调用一个轻量接口，排除网络和安全组问题。

::interviewer::
配置中心改错了，怎么定位影响范围？

::candidate level="deep"::
先查配置中心的变更记录，确认改了哪个 key、哪个命名空间、推给了哪些应用。应用侧看 `/actuator/env` 或配置刷新日志，确认新值是否已生效。然后按实例维度看错误率和延迟，如果只影响刷新过的实例，就先回滚配置或暂停刷新。配置中心的问题不能只看代码，要看配置版本和生效范围。

::interviewer::
服务治理里最容易被忽略的实操证据是什么？

::candidate::
是调用链和网关日志。很多人只看服务端日志，但请求可能在网关排队、被限流、被路由到错误实例，或者在调用方线程池里超时。排查时我会把 gateway access log、调用方日志、被调方日志和 tracing 按 traceId 串起来，确认请求到底死在哪一段。

::interviewer::
你怎么判断一个团队的服务治理比较成熟？

::candidate::
我会看故障能不能被限制住：下游慢时，上游是否有超时、熔断和隔离；配置错时，是否能灰度、审计和快速回滚；服务发布时，是否能按实例或流量比例放量；出问题时，是否能用指标和 trace 在几分钟内定位到具体依赖。
