---
title: Sentinel 接入 Prometheus 监控
date: 2024-02-02
description: 扩展 Sentinel，将监控数据作为 Spring Boot Actuator 暴露到 Prometheus，并展示到 Grafana 管理。
tags:
  - 扩展点
  - Sentinel
  - Prometheus
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Sentinel.png
---

# 背景

由于 Sentinel Dashboard 开源版本没有实现监控数据的持久化，只能查看 5 分钟的内存数据。在项目初期，我们没有足够的精力对 Sentinel 进行改造，因此，将 Sentinel 的监控数据集成到 Prometheus，并导入到 Grafana 可视化管理。

# 目标

扩展 Sentinel，将监控数据作为 Spring Boot Actuator 暴露到 Prometheus，并展示到 Grafana 管理。

# 实现

从官方的 PR 可以找到，Sentinel 提供了 [MetricExtension](https://github.com/alibaba/Sentinel/pull/735) 扩展点，允许您使用 SPI 扩展。

源码如下。

```java
package com.alibaba.csp.sentinel.metric.extension;

import com.alibaba.csp.sentinel.slots.block.BlockException;

public interface MetricExtension {

    void addPass(String resource, int n, Object... args);

    void addBlock(String resource, int n, String origin, BlockException blockException, Object... args);

    void addSuccess(String resource, int n, Object... args);

    void addException(String resource, int n, Throwable throwable);

    void addRt(String resource, long rt, Object... args);

    void increaseThreadNum(String resource, Object... args);

    void decreaseThreadNum(String resource, Object... args);
}
```

Sentinel 客户端执行onPass 或者 onBlock 方法会调用到这个扩展点。

```java
public class MetricEntryCallback implements ProcessorSlotEntryCallback<DefaultNode> {

    @Override
    public void onPass(Context context, ResourceWrapper rw, DefaultNode param, int count, Object... args)
    throws Exception {
        for (MetricExtension m : MetricExtensionProvider.getMetricExtensions()) {
            if (m instanceof AdvancedMetricExtension) {
                ((AdvancedMetricExtension) m).onPass(rw, count, args);
            } else {
                m.increaseThreadNum(rw.getName(), args);
                m.addPass(rw.getName(), count, args);
            }
        }
    }

    @Override
    public void onBlocked(BlockException ex, Context context, ResourceWrapper resourceWrapper, DefaultNode param,
                          int count, Object... args) {
        for (MetricExtension m : MetricExtensionProvider.getMetricExtensions()) {
            if (m instanceof AdvancedMetricExtension) {
                ((AdvancedMetricExtension) m).onBlocked(resourceWrapper, count, context.getOrigin(), ex, args);
            } else {
                m.addBlock(resourceWrapper.getName(), count, context.getOrigin(), ex, args);
            }
        }
    }
}
```

因此，我们只需要在 `MetricExtension` 集成 Prometheus 客户端即可。

首先，在 pom.xml 引入 Prometheus 依赖。

```xml
<!-- Prometheus -->
<dependency>
  <groupId>io.prometheus</groupId>
  <artifactId>simpleclient</artifactId>
  <version>0.16.0</version>
</dependency>
<!-- Sentinel -->
<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-core</artifactId>
  <optional>true</optional>
</dependency>
<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-datasource-extension</artifactId>
  <optional>true</optional>
</dependency>
<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-transport-simple-http</artifactId>
  <optional>true</optional>
</dependency>
```

根据 `MetricExtensionProvider` 源码，找到 SPI 加载的路径为 MetricExtension.class，对应的 package 路径为 `com.alibaba.csp.sentinel.metric.extension`。

```java
public class MetricExtensionProvider {
    private static List<MetricExtension> metricExtensions = new ArrayList();

    public MetricExtensionProvider() {
    }

    private static void resolveInstance() {
        List<MetricExtension> extensions = SpiLoader.of(MetricExtension.class).loadInstanceList();
        if (extensions.isEmpty()) {
            RecordLog.info("[MetricExtensionProvider] No existing MetricExtension found", new Object[0]);
        } else {
            metricExtensions.addAll(extensions);
            RecordLog.info("[MetricExtensionProvider] MetricExtension resolved, size={}", new Object[]{extensions.size()});
        }

    }

    public static List<MetricExtension> getMetricExtensions() {
        return metricExtensions;
    }

    public static void addMetricExtension(MetricExtension metricExtension) {
        metricExtensions.add(metricExtension);
    }

    static {
        resolveInstance();
    }
}
```

在目录 `src/main/resources/META-INF/services` 创建 `com.alibaba.csp.sentinel.metric.extension.MetricExtension` 文件，内容如下。

```
com.xxx.spi.PrometheusMetricExtension
```

创建 `PrometheusMetricExtension` 类。

```java
public class PrometheusMetricExtension implements MetricExtension {

    private SentinelCollectorRegistry registry;

    private SentinelCollectorRegistry getRegistry() {
        if (registry != null) {
            return registry;
        }
        this.registry = ApplicationContextHelper.getBean(SentinelCollectorRegistry.class); // 尝试获取 Spring Bean，具体代码可以搜索 eden-architect 库
        return registry;
    }

    @Override
    public void addPass(String resource, int n, Object... args) {
        getRegistry().getPassRequests().labels(resource).inc(n);
    }

    @Override
    public void addBlock(String resource, int n, String origin, BlockException ex, Object... args) {
        getRegistry().getBlockRequests().labels(resource, ex.getClass().getSimpleName(), ex.getRuleLimitApp(), origin).inc(n);
    }

    @Override
    public void addSuccess(String resource, int n, Object... args) {
        getRegistry().getSuccessRequests().labels(resource).inc(n);
    }

    @Override
    public void addException(String resource, int n, Throwable throwable) {
        getRegistry().getExceptionRequests().labels(resource).inc(n);
    }


    @Override
    public void addRt(String resource, long rt, Object... args) {
        getRegistry().getRtHist().labels(resource).observe(((double)rt) / 1000);
    }

    @Override
    public void increaseThreadNum(String resource, Object... args) {
    	getRegistry().getCurrentThreads().labels(resource).inc();
    }

    @Override
    public void decreaseThreadNum(String resource, Object... args) {
    	getRegistry().getCurrentThreads().labels(resource).dec();
    }
}
```

创建 `Prometheus` 客户端注册类。

```java
@Getter
public class SentinelCollectorRegistry {

	private Counter passRequests;

	private Counter blockRequests;

	private Counter successRequests;

	private Counter exceptionRequests;

	private Histogram rtHist;

	private Gauge currentThreads;

	public SentinelCollectorRegistry(CollectorRegistry registry) {
		passRequests = Counter.build()
			.name("sentinel_pass_requests_total")
			.help("total pass requests.")
			.labelNames("resource")
			.register(registry);
		blockRequests = Counter.build()
			.name("sentinel_block_requests_total")
			.help("total block requests.")
			.labelNames("resource", "type", "ruleLimitApp", "limitApp")
			.register(registry);
		successRequests = Counter.build()
			.name("sentinel_success_requests_total")
			.help("total success requests.")
			.labelNames("resource")
			.register(registry);
		exceptionRequests = Counter.build()
			.name("sentinel_exception_requests_total")
			.help("total exception requests.")
			.labelNames("resource")
			.register(registry);
		currentThreads = Gauge.build()
			.name("sentinel_current_threads")
			.help("current thread count.")
			.labelNames("resource")
			.register(registry);
		rtHist = Histogram.build()
			.name("sentinel_requests_latency_seconds")
			.help("request latency in seconds.")
			.labelNames("resource")
			.register(registry);
	}
}
```

将 `SentinelCollectorRegistry` 注册为 Spring Bean。

```java
@AutoConfigureBefore({ PrometheusMetricsExportAutoConfiguration.class })
@AutoConfigureAfter(MetricsAutoConfiguration.class)
@ConditionalOnClass(CollectorRegistry.class)
@ConditionalOnEnabledMetricsExport("prometheus")
@ConditionalOnProperty(name = "spring.cloud.sentinel.enabled", matchIfMissing = true)
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class SentinelPrometheusAutoConfiguration {

	@Bean
	public SentinelCollectorRegistry sentinelCollectorRegistry(CollectorRegistry registry) {
		log.debug("Autowired SentinelCollectorRegistry");
		return new SentinelCollectorRegistry(registry);
	}
}
```

业务项目在 `application.yaml` 设置 `spring.cloud.sentinel.enabled=true` 即可开启我们自定义的组件。启动项目，访问 `/actuator/prometheus` 端点。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-spring-boot-actuator.png)

导入到 Grafana 查看效果。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/sentinel/sentinel-grafana.png)

# 产出

团队引入这个组件后，可以在 Grafana 直接查看线上 QPS 流量，提高了监控效率。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-spring-cloud](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud/src/main/java/org/ylzl/eden/spring/cloud/sentinel/prometheus)。