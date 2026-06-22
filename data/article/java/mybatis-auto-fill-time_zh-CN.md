---
title: Mybatis 自动填充创建时间和更新时间字段
date: 2024-02-02
description: 为 MyBatis-Plus 提供自动填充功能。
tags:
  - 扩展点
  - Mybatis
  - Mybatis Plus
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MyBatis.png
---

# 背景

Spring JPA 提供了 `@CreatedDate`、`@LastModifiedDate` 注解，用于自动赋值实体类的创建时间和更新时间。但我们的团队主要使用 MyBatis-Plus 作为 ORM 框架，需要提供同类的机制支持。

# 目标

为 MyBatis-Plus 提供自动填充功能。

# 实现

MyBatis-Plus 也提供了自动填充功能，通过实现 `com.baomidou.mybatisplus.core.handlers.MetaObjectHandler` 接口来实现。笔者定了 `AutofillMetaObjectHandler` 类实现，如下。

```java
@RequiredArgsConstructor
public class AutofillMetaObjectHandler implements MetaObjectHandler {

	private final String createdDateFieldName;

	private final String lastModifiedDateFieldName;

	/**
	 * 插入元对象字段填充（用于插入时对公共字段的填充）
	 *
	 * @param metaObject 元对象
	 */
	@Override
	public void insertFill(MetaObject metaObject) {
		LocalDateTime now = LocalDateTime.now();
		this.strictInsertFill(metaObject, createdDateFieldName, LocalDateTime.class, now);
		this.strictUpdateFill(metaObject, lastModifiedDateFieldName, LocalDateTime.class, now);
	}

	/**
	 * 更新元对象字段填充（用于更新时对公共字段的填充）
	 *
	 * @param metaObject 元对象
	 */
	@Override
	public void updateFill(MetaObject metaObject) {
		LocalDateTime now = LocalDateTime.now();
		this.strictUpdateFill(metaObject, lastModifiedDateFieldName, LocalDateTime.class, now);
	}
}
```

预留了 `createdDateFieldName` 和 `lastModifiedDateFieldName` 字段，提供给 `@Configuration` 配置类扩展。

```java
@AutoConfigureAfter(MybatisPlusAutoConfiguration.class)
@ConditionalOnClass({
	SqlSessionFactory.class,
	SqlSessionFactoryBean.class,
	MybatisConfiguration.class
})
@ConditionalOnProperty(name = "mybatis-plus.extension.auto-fill.enabled", havingValue = "true")
@EnableConfigurationProperties({MybatisPlusExtensionProperties.class})
@Slf4j
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@Configuration(proxyBeanMethods = false)
public class MybatisPlusExtensionAutoConfiguration {

	@ConditionalOnMissingBean
	@Bean
	public MetaObjectHandler metaObjectHandler(MybatisPlusExtensionProperties properties) {
		log.debug("Autowired MetaObjectHandler");
		return new AutofillMetaObjectHandler(properties.getAutoFill().getCreatedDateFieldName(),
			properties.getAutoFill().getLastModifiedDateFieldName());
	}
}

@Data
@ConfigurationProperties(prefix = "mybatis-plus.extension")
public class MybatisPlusExtensionProperties {

	private final AutoFill autoFill = new AutoFill();

	@Data
	public static class AutoFill {

		private boolean enabled = true;

		private String createdDateFieldName = "created_date"; 

		private String lastModifiedDateFieldName = "last_modified_date";
	}
}
```

`MybatisPlusExtensionProperties` 属性类默认设置 `created_date` 字段为 SQL 表的创建时间，`last_modified_date` 为最后修改时间，业务方可以通过 `mybatis-plus.extension.auto-fill.created-date-field-name` 和 `mybatis-plus.extension.auto-fill.last-modified-date-field-name` 自行调整。

业务方在项目配置 `mybatis-plus.extension.auto-fill.enabled=true` 启用 MyBatis-Plus 自动填充，在实体类中使用 `@TableField` 注解来标记哪些字段需要自动填充，并指定填充的策略，如下。

```java
public class User {

    @TableField(fill = FieldFill.INSERT)
    private String createTime;

    @TableField(fill = FieldFill.UPDATE)
    private String updateTime;

    // 其他字段...
}
```

这样就完成了 MyBatis-Plus 的自动填充功能，根据这个思路，也可以实现 `@CreatedBy` 创建人和 `@LastModifiedBy` 最后修改人。

# 产出

一般我们在设计表都会保留两个字段：创建时间和最后修改时间，引入这个组件，可以简化业务的处理。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-mybatis-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-mybatis-spring-boot-starter)。