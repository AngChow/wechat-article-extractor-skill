---
name: wechat-article-extractor
description: Extract metadata and content from WeChat Official Account articles. Use when user needs to parse WeChat article URLs (mp.weixin.qq.com), extract article info (title, author, content, publish time, cover image), or convert WeChat articles to structured data. Supports various article types including posts, videos, images, voice messages, and reposts.
---

# WeChat Article Extractor

Extract metadata and content from WeChat Official Account (微信公众号) articles.

## Capabilities

- Parse WeChat article URLs (`mp.weixin.qq.com`)
- Extract article metadata: title, author, description, publish time
- Extract account info: name, avatar, alias, description
- Get article content (HTML)
- Get cover image URL
- Support multiple article types: post, video, image, voice, text, repost
- Handle various error cases: deleted content, expired links, access limits

## Mandatory Post-Processing Workflow

After a successful extraction, you MUST perform the following steps before responding to the user:

### Step 1: Extract article data

```javascript
const { extract } = require('./scripts/extract.js');
const result = await extract(url);
// If result.done === false, report the error and STOP.
```

### Step 2: Save fixed HTML file

Convert `data-src` to `src` in the HTML content and save to the wechat_articles directory.

```javascript
const { convertToFixedHtml, convertToMarkdown } = require('./convert.js');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.env.HOME, 'workspace_claude', 'wechat_articles');
// Ensure directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Generate a safe filename from the article title and date
const dateStr = result.data.msg_publish_time_str
  ? result.data.msg_publish_time_str.replace(/[\/:]/g, '-').split(' ')[0]
  : 'unknown-date';
const safeName = (result.data.msg_title || 'untitled')
  .replace(/[\/\\:*?"<>|“”‘’]/g, '_')
  .substring(0, 80);
const baseName = `${dateStr}_${safeName}`;

// Save fixed HTML
const htmlPath = path.join(outputDir, baseName + '.html');
fs.writeFileSync(htmlPath, convertToFixedHtml(result.data), 'utf8');
```

### Step 3: Save Markdown file

```javascript
// Save Markdown
const mdPath = path.join(outputDir, baseName + '.md');
fs.writeFileSync(mdPath, convertToMarkdown(result.data), 'utf8');
```

### Step 4: Summarize and report

Output the article summary to the user as before (title, author, publish time, key points, etc.), and at the end append a file locations section:

```
文件已保存至：
- HTML: wechat_articles/2026-04-15_薪人薪事3月薪升级...html
- Markdown: wechat_articles/2026-04-15_薪人薪事3月薪升级...md
```

Use relative paths from the workspace root (`~/workspace_claude/`).

## Important Rules

- ALWAYS perform all post-processing steps (save HTML + save Markdown) after a successful extraction. Never skip them.
- NEVER save files to /tmp or the Desktop. Always save to `~/workspace_claude/wechat_articles/`.
- The HTML file must have `data-src` replaced with `src` so images display correctly in browsers.
- The Markdown file must include a YAML frontmatter with title, author, date, source, and original_url.
- If the extraction fails, report the error code and message. Do NOT attempt to save files.
- If a file with the same name already exists, overwrite it without asking.

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 1000 | 文章获取失败 | General failure |
| 1001 | 无法获取文章信息 | Missing title or publish time |
| 1002 | 请求失败 | HTTP request failed |
| 1003 | 响应为空 | Empty response |
| 1004 | 访问过于频繁 | Rate limited |
| 1005 | 脚本解析失败 | Script parsing error |
| 1006 | 公众号已迁移 | Account migrated |
| 2001 | 请提供文章内容或链接 | Missing input |
| 2002 | 链接已过期 | Link expired |
| 2003 | 内容涉嫌侵权 | Content removed (copyright) |
| 2004 | 无法获取迁移后的链接 | Migration link failed |
| 2005 | 内容已被发布者删除 | Content deleted by author |
| 2006 | 内容因违规无法查看 | Content blocked |
| 2007 | 内容发送失败 | Failed to send |
| 2008 | 系统出错 | System error |
| 2009 | 不支持的链接 | Unsupported URL |
| 2010 | 内容获取失败 | Content fetch failed |
| 2011 | 涉嫌过度营销 | Marketing/spam content |
| 2012 | 账号已被屏蔽 | Account blocked |
| 2013 | 账号已自主注销 | Account deleted |
| 2014 | 内容被投诉 | Content reported |
| 2015 | 账号处于迁移流程中 | Account migrating |
| 2016 | 冒名侵权 | Impersonation |
