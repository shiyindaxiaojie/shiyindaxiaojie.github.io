---
title: MyBatis Auto-Fill Created and Updated Time Fields
date: 2024-02-02
description: Provide auto-fill functionality for MyBatis-Plus.
tags:
  - Extension Points
  - Mybatis
  - Mybatis Plus
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/MyBatis.png
---

# Background

Spring JPA provides `@CreatedDate` and `@LastModifiedDate` annotations for auto-filling entity creation and update times. But our team uses MyBatis-Plus as ORM framework, needing similar mechanism.

# Objective

Provide auto-fill functionality for MyBatis-Plus.

# Implementation

MyBatis-Plus provides auto-fill via `com.baomidou.mybatisplus.core.handlers.MetaObjectHandler` interface. I defined `AutofillMetaObjectHandler`:

```java
@RequiredArgsConstructor
public class AutofillMetaObjectHandler implements MetaObjectHandler {

    private final String createdDateFieldName;
    private final String lastModifiedDateFieldName;

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictInsertFill(metaObject, createdDateFieldName, LocalDateTime.class, now);
        this.strictUpdateFill(metaObject, lastModifiedDateFieldName, LocalDateTime.class, now);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictUpdateFill(metaObject, lastModifiedDateFieldName, LocalDateTime.class, now);
    }
}
```

Reserved `createdDateFieldName` and `lastModifiedDateFieldName` fields for `@Configuration` extension:

```java
@ConditionalOnProperty(name = "mybatis-plus.extension.auto-fill.enabled", havingValue = "true")
@EnableConfigurationProperties({MybatisPlusExtensionProperties.class})
@Configuration(proxyBeanMethods = false)
public class MybatisPlusExtensionAutoConfiguration {

    @ConditionalOnMissingBean
    @Bean
    public MetaObjectHandler metaObjectHandler(MybatisPlusExtensionProperties properties) {
        return new AutofillMetaObjectHandler(
            properties.getAutoFill().getCreatedDateFieldName(),
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

Business can customize via `mybatis-plus.extension.auto-fill.created-date-field-name` and `mybatis-plus.extension.auto-fill.last-modified-date-field-name`.

Enable with `mybatis-plus.extension.auto-fill.enabled=true`, use `@TableField` in entity:

```java
public class User {

    @TableField(fill = FieldFill.INSERT)
    private String createTime;

    @TableField(fill = FieldFill.UPDATE)
    private String updateTime;
}
```

Following this approach, `@CreatedBy` and `@LastModifiedBy` can also be implemented.

# Output

Table designs typically reserve created and last modified time fields. This component simplifies business handling.

Code is fully open source at [eden-mybatis-spring-boot-starter](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-spring-boot-starters/eden-mybatis-spring-boot-starter).
