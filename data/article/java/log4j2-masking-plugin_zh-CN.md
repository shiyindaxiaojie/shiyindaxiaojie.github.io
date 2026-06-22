---
title: Log4j2 扩展日志脱敏插件
date: 2024-03-15
description: 实现一个零侵入性的日志插件，并能支持原始数据检索。
tags:
  - 扩展点
  - Log4j2
  - 数据脱敏
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Log4j2.png
---

# 背景

日志脱敏是常见的安全需求。为了金融交易的安全性，国家强制规定对于**姓名**、**手机号**、**身份证号码**、**住址**等信息需要数据脱敏。一般我们会采取注解的形式指定字段进行脱敏处理，但这样对代码的侵入性较高。假设公司有几十个系统要改造，或者采购了一些系统没有源代码，怎么办？还有，日志脱敏后，系统用户需要通过手机号找出对应的日志，怎么匹配？

# 目标

实现一个零侵入性的日志插件，并能支持原始数据检索。

# 实现

我们调研了 Github 一些开源项目，发现 https://github.com/houbb/sensitive 能够满足这个需求，它通过 `Trie` 类对字符进行解析处理，具体的处理逻辑大部分封装在 `com.github.houbb.chars.scan.bs.CharsScanBs` 这个类，我们只需要引入 `CharsScanBs.scanAndReplace(text)` 就可以实现对原始日志的脱敏处理，被脱敏的内容后面自动追加原始数据库的 MD5 信息，假设用户反馈系统问题，会提供他的手机号，我们将手机号生成 MD5，去脱敏日志文件匹配，就能定位到原始数据。

Log4j2 插件提供了两个扩展方式 `AbstractStringLayout` 和 `RewritePolicy`。在这里，我们定义了 `MaskingStringLayout` 对 `AbstractStringLayout` 进行扩展。

```java 
@Plugin(name = "MaskingStringLayout", category = Node.CATEGORY, elementType = Layout.ELEMENT_TYPE, printObject = true)
public class MaskingStringLayout extends AbstractStringLayout {

    private final CharsScanBs charsScanBs;

    // 对日志内容进行脱敏处理
    @Override
    public String toSerializable(LogEvent event) {
        if (patternFormatterList == null || patternFormatterList.isEmpty()) {
            return event.getMessage().getFormattedMessage();
        }
        StringBuilder stringBuilder = new StringBuilder();
        for (PatternFormatter formatter : patternFormatterList) {
            formatter.format(event, stringBuilder);
        }
        return charsScanBs.scanAndReplace(stringBuilder.toString());
    }
	
    // 从 log4j.yml 读取配置
    @PluginFactory
    public static MaskingStringLayout createLayout(
        @PluginConfiguration final Configuration config,
        @PluginAttribute(value = "charset", defaultString = "UTF-8") String charset,
        @PluginAttribute(value = "pattern") String pattern,
        @PluginAttribute(value = "type") String type,
        @PluginAttribute(value = "prefix") String prefix,
        @PluginAttribute(value = "scanList") String scanList,
        @PluginAttribute(value = "replaceList") String replaceList,
        @PluginAttribute(value = "defaultReplace") String defaultReplace,
        @PluginAttribute(value = "replaceHash") String replaceHash,
        @PluginAttribute(value = "whiteList") String whiteList) {
            
        MaskingConfig maskingConfig = new MaskingConfig();
        if (type != null) {
            maskingConfig.setType(type);
        }
        // ... 
        MaskingStringLayout layout = new MaskingStringLayout(Charset.forName(charset), maskingConfig);
        layout.patternFormatterList = patternParser.parse(pattern);
        return layout;
    }
}
```

对应的 `MaskingConfig` 配置类如下。

```java 
@EqualsAndHashCode
@ToString
@Setter
@Getter
public class MaskingConfig {

    private String type = "chars-scan";

    private final CharsScan charsScan = new CharsScan();

    @EqualsAndHashCode(callSuper = false)
    @ToString
    @Setter
    @Getter
    public static class CharsScan {

        private String prefix = "：‘“，| ,:\\\"'=";

        private String scanList = "TELEPHONE,ID_CARD,BANK_CARD,PASSPORT,ADDRESS,EMAIL";

        private String replaceList = "TELEPHONE,ID_CARD,BANK_CARD,PASSPORT,ADDRESS,EMAIL";

        private String defaultReplace = "ANY_PARTIALLY_MASKED";

        private String replaceHash = "md5";

        private String whiteList = "";
    }
}
```

在 log4j2.yml 配置相关日志插件。

```yaml
Configuration:
  status: WARN
  monitorInterval: 30

  Properties:
    Property:
      - name: MASKING_STRATEGIES # 脱敏策略
        value: TELEPHONE,ID_CARD,BANK_CARD,PASSPORT,ADDRESS,EMAIL
      - name: MASKING_REPLACEMENT # 脱敏格式：ANY_PARTIALLY_MASKED（匹配任意半掩盖），ANY_FULLY_MASKED（匹配任意全掩盖）
        value: ANY_PARTIALLY_MASKED
      - name: MASKING_HASH # 脱敏哈希
        value: "md5"
      - name: MASKING_WHITELIST # 脱敏白名单
        value: ""

  Appenders:
    Console:
      name: STDOUT # 控制台
      target: SYSTEM_OUT
      MaskingStringLayout: # 脱敏插件
        pattern: ${LOG_PATTERN}
        strategies: ${MASKING_STRATEGIES}
        replacement: ${MASKING_REPLACEMENT}
        hash: ${MASKING_HASH}
        whitelist: ${MASKING_WHITELIST}
```

假设我要查询 18820132137 这个手机号的日志，可以通过 MD5 在线加密工具得到 MD5 值。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-md5-online.png)

搜索日志时，直接输入 MD5 值，就能定位到原始日志。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-console-relate.png)


# 产出

可以满足金融级别的监管合规检查，对业务零侵入，研发团队只需要在 log4j2.yml 引入相关日志插件就可以完成日志脱敏。

本文涉及的代码完全开源，感兴趣的伙伴可以查阅 [eden-data-masker](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-data-masker)。