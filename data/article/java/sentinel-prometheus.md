---
title: Sentinel Prometheus Monitoring Integration
date: 2024-02-02
description: Extend Sentinel to expose monitoring data as Spring Boot Actuator to Prometheus, displayed in Grafana.
tags:
  - Extension Points
  - Sentinel
  - Prometheus
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Sentinel.png
---

# Background

Sentinel Dashboard open-source version doesn't persist monitoring data - only 5 minutes of memory data viewable. Early in project, we lacked capacity to modify Sentinel, so integrated monitoring data to Prometheus and Grafana.

# Objective

Extend Sentinel to expose monitoring data as Spring Boot Actuator to Prometheus, displayed in Grafana.

# Implementation

From official PR, Sentinel provides [MetricExtension](https://github.com/alibaba/Sentinel/pull/735) SPI extension point:

```java
public interface MetricExtension {
    void addPass(String resource, int n, Object... args);
    void addBlock(String resource, int n, String origin, BlockException ex, Object... args);
    void addSuccess(String resource, int n, Object... args);
    void addException(String resource, int n, Throwable throwable);
    void addRt(String resource, long rt, Object... args);
    void increaseThreadNum(String resource, Object... args);
    void decreaseThreadNum(String resource, Object... args);
}
```

Sentinel client calls this extension on onPass or onBlock.

Add Prometheus and Sentinel dependencies in pom.xml.

Create SPI file `com.alibaba.csp.sentinel.metric.extension.MetricExtension` in `META-INF/services`:

```
com.xxx.spi.PrometheusMetricExtension
```

Create `PrometheusMetricExtension`:

```java
public class PrometheusMetricExtension implements MetricExtension {

    private SentinelCollectorRegistry registry;

    @Override
    public void addPass(String resource, int n, Object... args) {
        getRegistry().getPassRequests().labels(resource).inc(n);
    }

    @Override
    public void addBlock(String resource, int n, String origin, BlockException ex, Object... args) {
        getRegistry().getBlockRequests()
            .labels(resource, ex.getClass().getSimpleName(), ex.getRuleLimitApp(), origin).inc(n);
    }
    // ... other methods
}
```

Create `SentinelCollectorRegistry`:

```java
@Getter
public class SentinelCollectorRegistry {
    private Counter passRequests;
    private Counter blockRequests;
    private Counter successRequests;
    private Histogram rtHist;
    private Gauge currentThreads;

    public SentinelCollectorRegistry(CollectorRegistry registry) {
        passRequests = Counter.build()
            .name("sentinel_pass_requests_total")
            .help("total pass requests.")
            .labelNames("resource")
            .register(registry);
        // ... other metrics
    }
}
```

Register as Spring Bean:

```java
@ConditionalOnProperty(name = "spring.cloud.sentinel.enabled", matchIfMissing = true)
@Configuration(proxyBeanMethods = false)
public class SentinelPrometheusAutoConfiguration {

    @Bean
    public SentinelCollectorRegistry sentinelCollectorRegistry(CollectorRegistry registry) {
        return new SentinelCollectorRegistry(registry);
    }
}
```

Set `spring.cloud.sentinel.enabled=true` to enable. Access `/actuator/prometheus` endpoint.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-spring-boot-actuator.png)

Import to Grafana:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-grafana.png)

# Output

Teams can view production QPS traffic directly in Grafana, improving monitoring efficiency.

Code is fully open source at [eden-spring-cloud](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud/src/main/java/org/ylzl/eden/spring/cloud/sentinel/prometheus).
