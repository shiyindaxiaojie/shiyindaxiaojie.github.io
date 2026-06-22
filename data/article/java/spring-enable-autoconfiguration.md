---
title: Spring @AutoConfiguration Switch Extension
date: 2024-01-02
description: Provide a switch for Spring Boot Starters components to control auto-configuration.
tags:
  - Extension Points
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

Spring Boot Starters provides many common components. Some like `Kafka` and `RocketMQ` auto-configure when added to project, checking configs and creating external connections. We can't easily control Kafka off while RocketMQ on.

# Objective

Provide a switch for Spring Boot Starters components to control auto-configuration.

# Implementation

Spring Boot AutoConfiguration provides `AutoConfigurationImportFilter` to control whether `@Configuration` classes take effect. `AutoConfigurationImportSelector` calls filters, passing all `@Configuration` classes, filtering out unwanted ones:

```java
public class AutoConfigurationImportSelector ... {
    private static class ConfigurationClassFilter {
        List<String> filter(List<String> configurations) {
            for (AutoConfigurationImportFilter filter : this.filters) {
                boolean[] match = filter.match(candidates, this.autoConfigurationMetadata);
                for (int i = 0; i < match.length; i++) {
                    if (!match[i]) {
                        candidates[i] = null;  // false = auto-config disabled
                    }
                }
            }
        }
    }
}
```

For Kafka, add `spring.factories` in `src/main/resources/META-INF`:

```properties
org.springframework.boot.autoconfigure.AutoConfigurationImportFilter=\
  org.ylzl.spring.boot.kafka.autoconfigure.KafkaAutoConfigurationImportFilter
```

Implementation:

```java
public class KafkaAutoConfigurationImportFilter implements AutoConfigurationImportFilter, EnvironmentAware {

    private static final String MATCH_KEY = "spring.kafka.enabled";

    private static final String[] IGNORE_CLASSES = {
      "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
      "org.springframework.boot.actuate.autoconfigure.metrics.KafkaMetricsAutoConfiguration"
    };

    @Override
    public boolean[] match(String[] autoConfigurationClasses, AutoConfigurationMetadata metadata) {
        boolean disabled = !Boolean.parseBoolean(environment.getProperty(MATCH_KEY, "true"));
        boolean[] match = new boolean[autoConfigurationClasses.length];
        for (int i = 0; i < autoConfigurationClasses.length; i++) {
            int index = i;
            match[i] = !disabled || Arrays.stream(IGNORE_CLASSES)
                .noneMatch(e -> e.equals(autoConfigurationClasses[index]));
        }
        return match;  // false = config class disabled
    }
}
```

Set `spring.kafka.enabled=true` to enable Kafka, `spring.kafka.enabled=false` to disable.

# Output

Suitable for messaging engines, third-party payment platforms, SMS services. Teams reduced maintenance costs significantly. Also useful when third-party dependencies introduce unwanted auto-configurations.

Code is fully open source at [eden-kafka-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-kafka-spring-boot-starter).
