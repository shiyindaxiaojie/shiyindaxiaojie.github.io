---
title: Log4j2 Log Masking Plugin Extension
date: 2024-03-15
description: Implement a zero-intrusion log plugin supporting original data retrieval.
tags:
  - Extension Points
  - Log4j2
  - Data Masking
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Log4j2.png
---

# Background

Log masking is a common security requirement. For financial transaction security, regulations mandate masking **names**, **phone numbers**, **ID numbers**, **addresses**, etc. Typically we use annotations to specify fields for masking, but this is highly invasive to code. What if you have dozens of systems to modify, or purchased systems without source code? Also, after masking, how do users match logs by phone number?

# Objective

Implement a zero-intrusion log plugin supporting original data retrieval.

# Implementation

We researched GitHub projects and found https://github.com/houbb/sensitive meets requirements. It uses `Trie` class for character parsing. We simply call `CharsScanBs.scanAndReplace(text)` for log masking, automatically appending MD5 of original data. When users report issues with phone number, we generate MD5 and match in masked logs.

Log4j2 provides two extension methods: `AbstractStringLayout` and `RewritePolicy`. We define `MaskingStringLayout` extending `AbstractStringLayout`:

```java
@Plugin(name = "MaskingStringLayout", category = Node.CATEGORY, elementType = Layout.ELEMENT_TYPE)
public class MaskingStringLayout extends AbstractStringLayout {

    private final CharsScanBs charsScanBs;

    @Override
    public String toSerializable(LogEvent event) {
        StringBuilder stringBuilder = new StringBuilder();
        for (PatternFormatter formatter : patternFormatterList) {
            formatter.format(event, stringBuilder);
        }
        return charsScanBs.scanAndReplace(stringBuilder.toString());
    }

    @PluginFactory
    public static MaskingStringLayout createLayout(
        @PluginConfiguration final Configuration config,
        @PluginAttribute(value = "pattern") String pattern,
        @PluginAttribute(value = "scanList") String scanList,
        @PluginAttribute(value = "replaceHash") String replaceHash) {
        // ...
    }
}
```

Configure in log4j2.yml:

```yaml
Configuration:
  Properties:
    Property:
      - name: MASKING_STRATEGIES
        value: TELEPHONE,ID_CARD,BANK_CARD,PASSPORT,ADDRESS,EMAIL
      - name: MASKING_REPLACEMENT
        value: ANY_PARTIALLY_MASKED
      - name: MASKING_HASH
        value: "md5"

  Appenders:
    Console:
      name: STDOUT
      target: SYSTEM_OUT
      MaskingStringLayout:
        pattern: ${LOG_PATTERN}
        strategies: ${MASKING_STRATEGIES}
        hash: ${MASKING_HASH}
```

To search logs for phone 18820132137, get MD5 online:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-md5-online.png)

Search with MD5 to locate original logs:

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/log4j2/log4j2-console-relate.png)

# Output

Meets financial-grade compliance with zero business intrusion. Teams only need to add plugin to log4j2.yml for log masking.

Code is fully open source at [eden-data-masker](https://github.com/shiyindaxiaojie/eden-architect/tree/main/eden-components/eden-solutions/eden-data-masker).
