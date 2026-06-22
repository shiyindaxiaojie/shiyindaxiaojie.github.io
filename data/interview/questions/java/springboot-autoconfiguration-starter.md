---
id: springboot-autoconfiguration-starter
title: 一个 starter 引入后自动配置没生效，你怎么排查？
slug: springboot-autoconfiguration-starter
tracks:
  - java-backend
category: spring-boot
difficulty: senior
questionType: troubleshooting
frequency: medium
tags:
  - Spring Boot
  - 自动配置
  - Starter
  - 条件装配
  - 配置排查
summary: 从 starter 依赖、自动配置入口、条件注解、Bean 覆盖和配置属性绑定定位自动装配问题。
estimatedRead: 6
related:
  - spring-ioc-aop-circular-dependency
  - jvm-class-loading-parent-delegation
---

::interviewer::
Spring Boot starter 的价值是什么？它和普通依赖有什么区别？

::candidate level="core"::
普通依赖只是把 jar 放进来，starter 更像一组约定：依赖、默认配置、自动装配入口和条件判断都打包好。使用方引入后，在满足条件时自动创建 Bean。它的价值不是少写几行配置，而是把一类组件接入方式标准化。

::interviewer::
自动配置为什么不能无条件创建 Bean？

::candidate::
因为 Boot 要尊重应用自己的选择。自动配置通常会用 ConditionalOnClass、ConditionalOnMissingBean、ConditionalOnProperty 这类条件，只有类存在、用户没有自定义 Bean、配置开关满足时才生效。这样 starter 才不会一引入就抢走控制权。

::interviewer::
一个 starter 引入了，但 Bean 没有装配出来，你怎么查？

::candidate level="deep"::
我会先看条件评估报告，而不是猜。开发或灰度环境启动加 `--debug`，看 Condition Evaluation Report；如果开了 Actuator，就查 `/actuator/conditions`。然后用 `/actuator/beans` 看目标 Bean 是否存在、来源是什么，用 `/actuator/configprops` 看配置属性有没有绑定。常见原因是缺 class、配置项没开、已有同类型 Bean，或者自动配置类没有正确注册到 `AutoConfiguration.imports`。

::interviewer::
如果你写一个公司内部 starter，会注意什么？

::candidate::
我会把默认值做得保守，所有可能影响业务语义的能力都给开关；Bean 创建尽量用 `@ConditionalOnMissingBean`，允许业务覆盖；配置属性要有清晰前缀和校验。依赖上我会用 `mvn dependency:tree` 检查传递依赖，避免 starter 把日志、HTTP 客户端、Netty、JSON 这类基础库版本悄悄改掉。

::interviewer::
自动配置和普通 @Configuration 的边界在哪里？

::candidate::
普通 @Configuration 更像应用自己明确声明的配置，自动配置是框架根据环境推导出来的默认配置。自动配置应该站在“没有人配置时我提供一个合理默认”的位置，而不是强行替用户做决定。这个边界把握不好，后面排查 Bean 覆盖和条件不生效会很痛苦。

::interviewer::
线上升级 Spring Boot 后，某个自动配置行为变了，你会怎么定位？

::candidate::
我会先保存升级前后的 `/actuator/conditions`、`/actuator/beans`、`/actuator/configprops`，直接 diff 装配结果。再用 `mvn dependency:tree` 对比依赖版本，确认是不是某个 class 出现或消失导致条件命中变化。定位这类问题不能只看业务代码，因为触发点很可能在依赖版本、配置属性改名或默认条件变化里。
