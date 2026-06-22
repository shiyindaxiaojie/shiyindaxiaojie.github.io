---
title: Spring 扩展 @AutoConfiguration 开关
date: 2024-01-02
description: 给 Spring Boot Starters 的组件提供一个开关，控制自动装配。
tags:
  - 扩展点
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

Spring Boot Starters 提供了很多常用的组件，有些组件例如 `Kafka` 和 `RocketMQ`，引入到工程后会自动装配，它会检查您的配置，跟外部的组件创建一些连接，这个时候，我们很难控制 `Kafka` 关闭，`RocketMQ` 开启。

# 目标

给 Spring Boot Starters 的组件提供一个开关，控制自动装配。

# 实现

Spring Boot AutoCofiguration 提供了 `AutoConfigurationImportFilter` 过滤器，用来控制 `@Configuration` 配置类是否生效。查看 `AutoConfigurationImportSelector` 的源码，它会去调用 `AutoConfigurationImportFilter` 过滤器，传入所有的 `@Configuration` 配置类，通过 filter 方法筛选掉不需要的配置类，返回最新的配置类集合。

```java
public class AutoConfigurationImportSelector implements DeferredImportSelector, BeanClassLoaderAware, ResourceLoaderAware, BeanFactoryAware, EnvironmentAware, Ordered {
		
    private static class ConfigurationClassFilter {

        private final AutoConfigurationMetadata autoConfigurationMetadata;

        private final List<AutoConfigurationImportFilter> filters;

        ConfigurationClassFilter(ClassLoader classLoader, List<AutoConfigurationImportFilter> filters) {
            this.autoConfigurationMetadata = AutoConfigurationMetadataLoader.loadMetadata(classLoader);
            this.filters = filters;
        }

        protected AutoConfigurationEntry getAutoConfigurationEntry(AnnotationMetadata annotationMetadata) {
            if (!isEnabled(annotationMetadata)) {
                return EMPTY_ENTRY;
            }
            //...
            configurations = getConfigurationClassFilter().filter(configurations); // 过滤配置类
            fireAutoConfigurationImportEvents(configurations, exclusions);
            return new AutoConfigurationEntry(configurations, exclusions);
        }

        List<String> filter(List<String> configurations) {
            long startTime = System.nanoTime();
            String[] candidates = StringUtils.toStringArray(configurations);
            boolean skipped = false;
            for (AutoConfigurationImportFilter filter : this.filters) {
                boolean[] match = filter.match(candidates, this.autoConfigurationMetadata);
                for (int i = 0; i < match.length; i++) {
                    if (!match[i]) {
                        candidates[i] = null;
                        skipped = true; // 为 true 表示自动装配失效
                    }
                }
            }
            if (!skipped) {
                return configurations; // 返回对象表示自动装配生效
            }
            // ...
        }
    }	
}
```

以 Kafka 为例，我们可以在 `src/main/resources/META-INF` 添加 `spring.factories` 文件，内容如下：

```properties
# Auto Configuration Import Filters
org.springframework.boot.autoconfigure.AutoConfigurationImportFilter=\
  org.ylzl.spring.boot.kafka.autoconfigure.KafkaAutoConfigurationImportFilter
```

对应的代码实现如下：

```java
public class KafkaAutoConfigurationImportFilter implements AutoConfigurationImportFilter, EnvironmentAware {

    private static final String MATCH_KEY = "spring.kafka.enabled";

    private static final String[] IGNORE_CLASSES = {
      "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
      "org.springframework.boot.actuate.autoconfigure.metrics.KafkaMetricsAutoConfiguration"
    };

    private Environment environment;

    @Override
    public void setEnvironment(@NotNull Environment environment) {
        this.environment = environment;
    }

    @Override
    public boolean[] match(String[] autoConfigurationClasses, AutoConfigurationMetadata autoConfigurationMetadata) {
        boolean disabled = !Boolean.parseBoolean(environment.getProperty(MATCH_KEY, Conditions.TRUE));
        boolean[] match = new boolean[autoConfigurationClasses.length];
        for (int i = 0; i < autoConfigurationClasses.length; i++) {
            int index = i;
            match[i] = !disabled || Arrays.stream(IGNORE_CLASSES).noneMatch(e -> e.equals(autoConfigurationClasses[index]));
        }
        return match; // 如果 match 为 false，对应的配置类不生效
    }
}
```

代码扩展完成，当设置 `spring.kafka.enabled=true` 时开启 Kafka，设置 `spring.kafka.enabled=false` 时关闭 Kafka。

# 产出

适用接入消息引擎、第三方支付平台、第三方短信服务等各种场景，研发团队引入了这个方案后，极大减少了维护成本，在切换厂商接口也能省下很多时间。并且，在引入第三方项目依赖也会遇到自动装配的问题，一般情况下，第三方依赖会引入多项配置，这些配置我们用不到，又修改不了相关源码，需要从扩展点屏蔽。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-kafka-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-kafka-spring-boot-starter)。