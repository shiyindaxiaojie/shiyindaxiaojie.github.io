---
title: Spring AOP Custom Aspect Path Extension
date: 2023-10-23
description: Implement configurable logging aspect path component with zero business code intrusion.
tags:
  - Extension Points
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

Some frameworks implement logging aspects by writing aspect class with `@Aspect` specifying package path, then enabling via `@EnableAspectJAutoProxy`. Business code must follow framework's package path convention - highly invasive and not suitable for all scenarios.

# Objective

Implement configurable logging aspect path component with zero business code intrusion.

# Implementation

Two approaches for custom aspect paths: `Annotation` and `AutoConfiguration`. Let's explain Annotation approach first.

For logging aspect, design config class `AccessLogConfig`:

```java
@Getter @Setter
public class AccessLogConfig {
    private boolean enabledMdc = true;
    private String expression;  // Package name for log output
    private double sampleRate = 1.0;
    private boolean logArguments = true;
    private boolean logReturnValue = true;
    private boolean logExecutionTime = true;
    private int maxLength = 500;
    private long slowThreshold = 1000;
}
```

Define annotation `@EnableAccessLog`:

```java
@Import(AccessLogImportSelector.class)
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface EnableAccessLog {
    boolean proxyTargetClass() default false;
    AdviceMode mode() default AdviceMode.PROXY;
    int order() default Ordered.LOWEST_PRECEDENCE;
    String expression() default "";
}
```

Write `AccessLogConfiguration`:

```java
@Configuration(proxyBeanMethods = false)
public class AccessLogConfiguration implements ImportAware {

    @Bean
    public AccessLogAdvisor accessLogAdvisor(ObjectProvider<AccessLogConfig> configs, AccessLogInterceptor interceptor) {
        AccessLogAdvisor advisor = new AccessLogAdvisor();
        advisor.setExpression(getAccessLogConfig(configs).getExpression());
        advisor.setAdvice(interceptor);
        return advisor;
    }
}
```

But `@EnableAccessLog` still has some intrusion. Best approach is full `AutoConfiguration`:

```java
@ConditionalOnProperty(prefix = "logging.access", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(AccessLogProperties.class)
@Configuration(proxyBeanMethods = false)
@EnableAccessLog
public class AccessLogAutoConfiguration { }
```

Business just configures:

```yaml
logging:
  access:
    enabled: true
    expression: within(org.ylzl.eden.demo.adapter.*.web..*)
```

Testing HTTP request shows aspect printing request parameters, return values, and execution time.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-aop-logging.png)

# Output

Provides unified logging template for teams. Teams only need to adjust package path to complete integration with zero code intrusion.

Code is fully open source at [eden-spring-framework](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-framework/src/main/java/org/ylzl/eden/spring/framework/logging) and [eden-spring-boot](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot/src/main/java/org/ylzl/eden/spring/boot/logging).
