---
title: Log4j2 Zero-Downtime Dynamic Configuration Reload
date: 2023-10-12
description: Implement zero-downtime log4j configuration changes with dynamic log level and output path control.
tags:
  - Extension Points
  - Log4j2
  - Nacos
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Log4j2.png
---

# Background

Sometimes production needs to temporarily adjust log Level or modify log output Appender. Spring Boot's log refresh doesn't satisfy this - still requires service restart. To solve this, we need dynamic log4j2 configuration reload.

# Objective

Implement zero-downtime log4j configuration changes with dynamic log level and output path control.

# Implementation

Nacos config listening uses `NacosConfigManager.getConfigService().addListener()`. To prevent Nacos server downtime, Nacos Client implements local caching at: `${user.home}/nacos/config/fixed-host_port-namespace_tenant/snapshot-tenant/namespace/group`. Convert config file to URI and reload using log4j2 API `Configurator.reconfigure(uri)`.

First, define config properties class `Log4j2NacosProperties`:

```java
@Setter
@Getter
@ConfigurationProperties(prefix = Log4j2NacosProperties.PREFIX)
public class Log4j2NacosProperties {

    public static final String PREFIX = "log4j2.nacos";

    private boolean enabled = false;
    private String group;
    private String dataId = "log4j2.yml";
}
```

Create auto-configuration `Log4j2NacosAutoConfiguration`:

```java
@ConditionalOnProperty(prefix = Log4j2NacosProperties.PREFIX, name = "enabled", havingValue = "true")
@AutoConfigureAfter(NacosConfigBootstrapConfiguration.class)
@EnableConfigurationProperties(Log4j2NacosProperties.class)
@RequiredArgsConstructor
@Configuration(proxyBeanMethods = false)
public class Log4j2NacosAutoConfiguration implements InitializingBean {

    @Override
    public void afterPropertiesSet() throws Exception {
        File configFile = this.getFile(RPC_CLIENT);
        if (!configFile.exists()) {
            configFile = this.getFile(getServerName());
        }
        URI uri = configFile.toURI();
        log.info("Loading log4j2 config from nacos cache: {}", uri);
        Configurator.reconfigure(uri);

        nacosConfigManager.getConfigService().addListener(
            log4j2ConfigProperties.getDataId(),
            log4j2ConfigProperties.getGroup(),
            new Listener() {
                @Override
                public void receiveConfigInfo(String configInfo) {
                    log.info("Reloading log4j2 config from nacos listener");
                    Configurator.reconfigure(uri);
                }
                @Override
                public Executor getExecutor() { return null; }
            });
    }
}
```

Application.yaml configuration:

```yaml
spring:
  cloud:
    nacos:
      config:
        enabled: true
        server-addr: localhost:8848
        namespace: demo
        group: eden
        extension-configs:
          - group: eden
            data-id: log4j2.yml
            refresh: true

log4j2:
  nacos:
    enabled: false
    group: eden
    data-id: log4j2.yml
```

Configure log4j2.yml directly in Nacos.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-nacos-config.png)

After publishing changes in Nacos, application logs show `Reloading log4j2 config file from nacos listener`, indicating successful reload.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/reloading-log4j2-config-file.png)

# Output

Development teams can adjust production log configuration online - dynamically control log levels and output paths, improving production troubleshooting efficiency.

Code is fully open source at [eden-nacos-config-spring-cloud-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud-starters/eden-nacos-config-spring-cloud-starter).
