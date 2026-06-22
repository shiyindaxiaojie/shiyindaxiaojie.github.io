---
title: Spring 扩展 Bean 动态注册和销毁
date: 2024-02-11
description: 监听 Spring Boot Starters 组件的配置变化，动态注册销毁 Bean。
tags:
  - 扩展点
  - Spring Boot
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Spring.png
---

# 背景

Spring Boot Starters 的自动装配机制给我们提供了非常丰富的扩展点，但有时候需要动态开启或者关闭某些组件，只能修改配置，重启服务才能生效。例如，我们接入了 Arthas 工具，有时候需要关闭，有时候需要开启，但又不能随意重启服务。

# 目标

监听 Spring Boot Starters 组件的配置变化，动态注册销毁 Bean。

# 实现

以 Arthas Spring Boot Starter 组件为例。我们发现 Spring Cloud 组件提供了 `EnvironmentChangeEvent` 作为配置变更事件，传入 `ApplicationListener` 监听器可以实现配置变化的监听，代码片段如下：

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
                    registerBean(); // 注册 Bean
                } else {
                    destroyBean(); // 销毁 Bean
                }
                break;
            }
        }
    }

    private void registerBean() {
        DefaultListableBeanFactory defaultListableBeanFactory = getDefaultListableBeanFactory();
        if (defaultListableBeanFactory.containsBean(ARTHAS_AGENT)) {  // 检查 Bean 是否存在 Spring 缓存
            defaultListableBeanFactory.getBean(ARTHAS_AGENT)).init(); 
        } else {
            defaultListableBeanFactory.registerSingleton(ARTHAS_AGENT, new ArthasAgent(arthasConfigMap, arthasProperties));
        }
    }

    private void destroyBean() {
        DefaultListableBeanFactory defaultListableBeanFactory = getDefaultListableBeanFactory();
        if (defaultListableBeanFactory.containsBean(ARTHAS_AGENT)) {
            defaultListableBeanFactory.getBean(ARTHAS_AGENT)).destroy();
            defaultListableBeanFactory.destroySingleton(ARTHAS_AGENT); // 从 Spring 缓存移除 Bean
        }
    }

    @NotNull
    private DefaultListableBeanFactory getDefaultListableBeanFactory() {
        return (DefaultListableBeanFactory) applicationContext.getAutowireCapableBeanFactory();
    }
}
```

将 `ArthasEnvironmentChangeListener` 复制到 `ArthasAutoConfiguration` 类注册 Bean。

```java
@AutoConfigureBefore(ArthasConfiguration.class)
@EnableConfigurationProperties({ SpringArthasProperties.class, ArthasProperties.class })
@RequiredArgsConstructor
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class ArthasAutoConfiguration {

    // 注册监听器
    @Bean
    public ArthasEnvironmentChangeListener arthasEnvironmentChangeListener(
    @Autowired @Qualifier(ARTHAS_CONFIG_MAP) Map<String, String> arthasConfigMap) {
        return new ArthasEnvironmentChangeListener(applicationContext, environment, arthasProperties, arthasConfigMap);
    }

    // 启动时判断是否开启，如果开启则注册 Bean
    @ConditionalOnProperty(
        name = {"spring.arthas.enabled"},
        matchIfMissing = true
    )
    @Primary
    @Bean
    public ArthasAgent arthasAgent(@Autowired @Qualifier(ARTHAS_CONFIG_MAP) Map<String, String> arthasConfigMap) {
        arthasConfigMap = StringUtils.removeDashKey(arthasConfigMap);
        return init(arthasConfigMap, environment, arthasProperties); // 初始化 Bean，细节省略
    }
}
```

将 `ArthasAutoConfiguration` 类添加到 spring.factories 文件即可。

在 Nacos 设置 `spring.arthas.enabled=false`，期望关闭 Arthas。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-nacos-disabled-arthas.png)

从控制台可以看到 `Destroy arthas from ws:...` 字眼。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-java-destroy-arthas.png)

在 Nacos 设置 `spring.arthas.enabled=true`，期望开启 Arthas。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-nacos-enabled-arthas.png)

从控制台可以看到 `Register arthas to ws:...` 字眼。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-java-register-arthas.png)

# 产出

研发团队在生产环境的配置中心发布配置更新，可以实现应用零停机动态注册和销毁 Bean，解决了特定场景的需求。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-arthas-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-arthas-spring-boot-starter)。