---
title: Log4j2 零停机动态加载配置文件
date: 2023-10-12
description: 实现零停机修改 log4j 配置，动态配置日志级别和输出路径。
tags:
  - 扩展点
  - Log4j2
  - Nacos
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Log4j2.png
---

# 背景

有时候生产环境需要临时调整日志级别 Level 或者修改日志输出路径 Appender，使用 Spring Boot 提供的日志刷新不能满足这个需求，最终还是重启服务才能生效。为了解决这个问题，需要实现 log4j2 配置文件的动态加载。

# 目标

实现零停机修改 log4j 配置，动态配置日志级别和输出路径。

# 实现

Nacos 配置监听通过 `NacosConfigManager.getConfigService().addListener()` 实现，为了避免 Nacos 服务端宕机，Nacos Client 实现了本地缓存机制，配置文件保存路径如下： `${user.home}/nacos/config/fixed-host_port-namespace_tenant/snapshot-tenant/namespace/group`，将配置文件转化为 URI，利用 log4j2 的 API 重新加载日志配置 `Configurator.reconfigure(uri)`。

首先，定义配置属性类 `Log4j2NacosProperties`。

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

编写自动装配组件 `Log4j2NacosAutoConfiguration`。

```java
@ConditionalOnProperty(
    prefix = Log4j2NacosProperties.PREFIX,
    name = "enabled"
    havingValue = "true"
)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@AutoConfigureAfter(NacosConfigBootstrapConfiguration.class)
@EnableConfigurationProperties(Log4j2NacosProperties.class)
@ConditionalOnClass(LogManager.class)
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class Log4j2NacosAutoConfiguration implements InitializingBean {

    private static final String RPC_CLIENT = "config_rpc_client";

    private static final String FIXED = "fixed";

    private final NacosConfigProperties nacosConfigProperties;

    private final Log4j2NacosProperties log4j2ConfigProperties;

    private final NacosConfigManager nacosConfigManager;

    @Override
    public void afterPropertiesSet() throws Exception {
        File configFile = this.getFile(RPC_CLIENT);
        if (!configFile.exists()) {
            configFile = this.getFile(getServerName());
        }
        if (!configFile.exists()) {
            log.warn("Loading log4j2 config file from nacos config cache failed");
            return;
        }
        URI uri = configFile.toURI();
        log.info("Loading log4j2 config file from nacos config cache: {}", uri);
        Configurator.reconfigure(uri);
        log.info("Loading log4j2 config file finished.");

        nacosConfigManager.getConfigService().addListener(
            log4j2ConfigProperties.getDataId(), log4j2ConfigProperties.getGroup(),
            new Listener() {

                @Override
                public void receiveConfigInfo(String configInfo) {
                    log.info("Reloading log4j2 config file from nacos listener, changed info: \n{}", configInfo);
                    Configurator.reconfigure(uri);
                }

                @Override
                public Executor getExecutor() {
                    return null;
                }
            });
    }

    private File getFile(String name) {
        File file = getFailoverFile(name);
        if (!file.exists()) {
            file = getSnapshotFile(name);
        }
        return file;
    }

    private File getSnapshotFile(String name) {
        return LocalConfigInfoProcessorExporter.getSnapshotFile(name,
            log4j2ConfigProperties.getDataId(),
            log4j2ConfigProperties.getGroup(), getNamespace());
    }

    private File getFailoverFile(String name) {
        return LocalConfigInfoProcessorExporter.getFailoverFile(name,
            log4j2ConfigProperties.getDataId(),
            log4j2ConfigProperties.getGroup(), getNamespace());
    }

    private String getServerName() {
        return StringUtils.join(FIXED, "-", getServerAddr());
    }

    private String getServerAddr() {
        return nacosConfigProperties.getServerAddr()
            .replaceAll("http(s)?://", "")
            .replaceAll(":", "_");
    }

    private String getNamespace() {
        return nacosConfigProperties.getNamespace();
    }
}
```

由于 `LocalConfigInfoProcessor` 部分方法私有化，需要重写方法，暴露出来。

```java
public class LocalConfigInfoProcessorExporter extends LocalConfigInfoProcessor {

    public static final String SUFFIX = "_nacos";

    public static final String ENV_CHILD = "snapshot";

    public static final String FAILOVER_FILE_CHILD_1 = "data";

    public static final String FAILOVER_FILE_CHILD_2 = "config-data";

    public static final String FAILOVER_FILE_CHILD_3 = "config-data-tenant";

    public static final String SNAPSHOT_FILE_CHILD_1 = "snapshot";

    public static final String SNAPSHOT_FILE_CHILD_2 = "snapshot-tenant";

    public static File getFailoverFile(String serverName, String dataId, String group, String tenant) {
        File tmp = new File(LOCAL_SNAPSHOT_PATH, serverName + SUFFIX);
        tmp = new File(tmp, FAILOVER_FILE_CHILD_1);
        if (StringUtils.isBlank(tenant)) {
            tmp = new File(tmp, FAILOVER_FILE_CHILD_2);
        } else {
            tmp = new File(tmp, FAILOVER_FILE_CHILD_3);
            tmp = new File(tmp, tenant);
        }
        return new File(new File(tmp, group), dataId);
    }

    public static File getSnapshotFile(String envName, String dataId, String group, String tenant) {
        File tmp = new File(LOCAL_SNAPSHOT_PATH, envName + SUFFIX);
        if (StringUtils.isBlank(tenant)) {
            tmp = new File(tmp, SNAPSHOT_FILE_CHILD_1);
        } else {
            tmp = new File(tmp, SNAPSHOT_FILE_CHILD_2);
            tmp = new File(tmp, tenant);
        }
        return new File(new File(tmp, group), dataId);
    }
}
```

代码扩展完成，对应的 application.yaml 配置文件如下：

```yaml
spring:
  cloud:
    nacos:
      config: # 配置中心
        enabled: true # 默认关闭，请按需开启
        server-addr: localhost:8848
        namespace: demo
        group: eden
        username: nacos
        password: nacos
        extension-configs:
          - group: eden
            data-id: log4j2.yml
            refresh: true

log4j2:
  nacos: # Nacos 支持 log4j2 刷新，需要同时设置 spring.cloud.nacos.config.extension-configs
    enabled: false
    group: eden
    data-id: log4j2.yml
```

关于 log4j2.yml 配置文件，直接在 Nacos 设置完成。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-nacos-config.png)

在 Nacos 修改 log4j.yml 发布后，可以从应用日志看到 `Reloading log4j2 config file from nacos listener, changed info`，表示日志已经重新加载。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/reloading-log4j2-config-file.png)

# 产出

研发团队引入这个组件后，可以根据自己的需求在线调整生产环境的日志配置，动态控制日志级别、输出路径，提高线上排查效率。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-nacos-config-spring-cloud-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-cloud-starters/eden-nacos-config-spring-cloud-starter)。