---
title: Spring Dynamic Bean Registration and Destruction
date: 2024-02-11
description: Listen to Spring Boot Starters component config changes, dynamically register and destroy Beans.
tags:
  - Extension Points
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# Background

Spring Boot Starters auto-configuration provides rich extension points, but dynamic enable/disable of components requires config changes and service restart. For example, with Arthas tool integration, sometimes we need to enable/disable without restarting.

# Objective

Listen to Spring Boot Starters component config changes, dynamically register and destroy Beans.

# Implementation

Using Arthas Spring Boot Starter as example. Spring Cloud provides `EnvironmentChangeEvent` for config change events, passed to `ApplicationListener`:

```java
@RequiredArgsConstructor
@Slf4j
public class ArthasEnvironmentChangeListener implements ApplicationListener<EnvironmentChangeEvent> {

    public static final String ARTHAS_AGENT = "arthasAgent";

    private final ApplicationContext applicationContext;
    private final Environment environment;
    private final ArthasProperties arthasProperties;
    private final Map<String, String> arthasConfigMap;

    @Override
    public void onApplicationEvent(EnvironmentChangeEvent event) {
        Set<String> keys = event.getKeys();
        for (String key : keys) {
            if ("spring.arthas.enabled".equals(key)) {
                if (Boolean.parseBoolean(environment.getProperty(key))) {
                    registerBean();
                } else {
                    destroyBean();
                }
                break;
            }
        }
    }

    private void registerBean() {
        DefaultListableBeanFactory factory = getDefaultListableBeanFactory();
        if (factory.containsBean(ARTHAS_AGENT)) {
            factory.getBean(ARTHAS_AGENT)).init();
        } else {
            factory.registerSingleton(ARTHAS_AGENT, new ArthasAgent(arthasConfigMap, arthasProperties));
        }
    }

    private void destroyBean() {
        DefaultListableBeanFactory factory = getDefaultListableBeanFactory();
        if (factory.containsBean(ARTHAS_AGENT)) {
            factory.getBean(ARTHAS_AGENT)).destroy();
            factory.destroySingleton(ARTHAS_AGENT);
        }
    }
}
```

Register listener in `ArthasAutoConfiguration`:

```java
@Configuration(proxyBeanMethods = false)
public class ArthasAutoConfiguration {

    @Bean
    public ArthasEnvironmentChangeListener arthasEnvironmentChangeListener(...) {
        return new ArthasEnvironmentChangeListener(...);
    }

    @ConditionalOnProperty(name = {"spring.arthas.enabled"}, matchIfMissing = true)
    @Bean
    public ArthasAgent arthasAgent(...) {
        return init(arthasConfigMap, environment, arthasProperties);
    }
}
```

Set `spring.arthas.enabled=false` in Nacos to disable:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-nacos-disabled-arthas.png)

Console shows `Destroy arthas from ws:...`:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-java-destroy-arthas.png)

Set `spring.arthas.enabled=true` in Nacos to enable:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-java-register-arthas.png)

# Output

Teams can publish config updates in production config center to achieve zero-downtime dynamic Bean registration and destruction.

Code is fully open source at [eden-arthas-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-arthas-spring-boot-starter).
