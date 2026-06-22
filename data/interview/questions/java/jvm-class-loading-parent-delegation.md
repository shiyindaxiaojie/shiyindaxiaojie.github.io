---
id: jvm-class-loading-parent-delegation
title: 类加载和双亲委派为什么会影响线上隔离和冲突？
slug: jvm-class-loading-parent-delegation
tracks:
  - java-backend
category: java
difficulty: senior
questionType: principle
frequency: medium
tags:
  - JVM
  - 类加载
  - 双亲委派
  - ClassLoader 隔离
  - SPI 扩展机制
summary: 从加载、链接、初始化、类身份和双亲委派破坏场景理解依赖冲突与插件隔离。
estimatedRead: 6
related:
  - springboot-autoconfiguration-starter
  - jvm-memory-oom-leak-troubleshooting
---

::interviewer::
一个类从 .class 文件到能被使用，大概经历哪些阶段？

::candidate level="core"::
大致是加载、链接、初始化。加载是把字节码读进来并生成 Class 对象；链接里包含校验、准备和解析；初始化才会执行静态变量赋值和 static 代码块。线上排查类问题时，区分“类找不到”“方法签名不匹配”“初始化失败”很重要，它们不是一类问题。

::interviewer::
双亲委派解决了什么问题？

::candidate::
它让类加载请求先交给父加载器，父加载器加载不了才由子加载器处理。这样核心类库不会被应用随便覆盖，比如你自己写一个 java.lang.String 不应该替换 JDK 的 String。它解决的是安全和一致性问题，也减少同一个类被不同加载器重复加载的混乱。

::interviewer::
同一个类名，为什么有时 JVM 认为它们不是同一个类？

::candidate level="deep"::
JVM 判断类身份不只看全限定名，还看加载它的 ClassLoader。同名类如果由不同 ClassLoader 加载，就是两个不同类型。插件系统、应用服务器、热部署里经常会遇到这种问题，表现可能是 ClassCastException，而且错误信息看起来很迷惑：明明类名一样，却不能转换。

::interviewer::
那为什么还会有人破坏双亲委派？

::candidate::
因为有些场景需要隔离或反向加载。比如插件要带自己的依赖版本，不能被宿主的旧版本污染；JDBC SPI 又需要核心库反过来发现应用里的驱动实现。破坏双亲委派不是为了炫技，而是在安全、一致性和隔离性之间重新取舍。

::interviewer::
线上出现 NoSuchMethodError，你会往类加载方向怎么查？

::candidate::
NoSuchMethodError 很常见原因是编译期和运行期依赖版本不一致。我会先用 `mvn dependency:tree -Dincludes=<groupId>:<artifactId>` 查构建期依赖，再用 Arthas `sc -d com.xxx.Foo` 看运行时这个类实际从哪个 jar 加载、由哪个 ClassLoader 加载。确认运行期 jar 里是否真的有这个方法签名，再找是谁把旧版本带进来的。

::interviewer::
Spring Boot fat jar 这种打包方式会带来什么类加载特点？

::candidate::
它把应用类和依赖 jar 重新组织在一个可执行包里，由 Boot 自己的加载器处理嵌套 jar。排查时我会看 `BOOT-INF/lib` 里实际打进了哪些 jar，也会用 Arthas `sc -d` 或 `jad` 确认运行时加载来源。遇到依赖冲突、资源覆盖或 starter 自动装配异常时，不能只看 pom，要看最终包和运行时 ClassLoader。
