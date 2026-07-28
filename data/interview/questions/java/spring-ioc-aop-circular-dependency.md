---
id: spring-ioc-aop-circular-dependency
title: Spring 为什么能解决部分循环依赖，哪些情况解决不了？
slug: spring-ioc-aop-circular-dependency
tracks:
  - java-backend
category: spring-boot
stage: technical
difficulty: senior
questionType: principle
frequency: high
tags:
  - Spring Boot
  - IoC 容器
  - AOP 代理
  - 循环依赖
  - Bean 生命周期
summary: 从 Bean 创建流程、三级缓存、早期引用、AOP 代理和构造器注入边界理解循环依赖。
estimatedRead: 7
related:
  - spring-transaction-failure-boundary
  - springboot-autoconfiguration-starter
---

::interviewer::
Spring 容器创建一个 Bean，大概经历哪些关键步骤？

::candidate level="core"::
我会按“实例化、填充属性、初始化、放入单例池”来看。实例化只是对象 new 出来了，属性还没注入；初始化阶段才会执行 aware、post processor、init 方法等扩展。理解这个流程后，循环依赖和 AOP 代理的问题就能放到具体阶段里看。

::interviewer::
Spring 为什么能解决一部分循环依赖？

::candidate::
它利用了单例 Bean 创建过程中的早期引用。A 创建出来但还没填充完属性时，可以先把一个早期引用暴露出去，B 注入 A 时拿到这个引用，B 创建完成后再回到 A 继续注入 B。这个方案成立的前提是对象能先实例化出来，所以主要针对 setter 或字段注入的单例场景。

::interviewer::
构造器循环依赖为什么解决不了？

::candidate level="deep"::
构造器注入要求创建 A 时必须先拿到 B，创建 B 时又必须先拿到 A。这个时候连“半成品对象”都还没有，无法提前暴露引用。它不是 Spring 不努力，而是对象创建顺序本身没有起点。遇到这种情况，我会重新看职责边界，通常说明两个 Bean 互相知道太多。

::interviewer::
三级缓存和 AOP 代理有什么关系？

::candidate::
如果一个 Bean 最终要被 AOP 代理，其他 Bean 早期拿到的就不能是原始对象，否则后面事务、异步、切面都可能失效。三级缓存里保存的是创建早期引用的工厂，必要时能提前生成代理对象。这样依赖方拿到的引用和最终单例池里的对象语义保持一致。

::interviewer::
所有循环依赖都应该让 Spring 帮忙解决吗？

::candidate::
不应该。容器能解开不代表设计合理。两个服务相互调用，往往说明职责没有切干净，或者缺少一个协调者、领域服务、事件机制。我的习惯是先问为什么需要互相依赖，能拆边界就拆；只有确实是基础设施层的小范围互引，才接受容器兜底。

::interviewer::
线上遇到循环依赖启动失败，你会怎么处理？

::candidate::
我会先看启动异常里的 dependency cycle，找到最短依赖环，而不是在一堆 Bean 名里乱改。排查时可以临时打开 `logging.level.org.springframework.beans.factory.support=DEBUG`，或者通过 `/actuator/beans` 看 Bean 关系。然后判断是构造器循环、prototype、还是 AOP 早期代理导致的问题。短期可以用 `@Lazy` 或拆接口缓解，但最终要把双向调用改成单向依赖、事件通知或第三方协调。
