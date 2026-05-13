const cheerio = require('cheerio');

/**
 * 将微信文章的 HTML 内容转换为 Markdown
 * @param {object} data - extract() 返回的 data 对象
 * @returns {string} Markdown 字符串
 */
function convertToMarkdown(data) {
  const $ = cheerio.load(data.msg_content || '', { decodeEntities: false });

  let markdown = `---
title: "${(data.msg_title || '').replace(/"/g, '\\"')}"
author: "${(data.msg_author || data.account_name || '').replace(/"/g, '\\"')}"
date: "${data.msg_publish_time_str || ''}"
source: "${(data.account_name || '').replace(/"/g, '\\"')}"
original_url: "${data.msg_link || ''}"
---

# ${data.msg_title || ''}

**作者**: ${data.msg_author || data.account_name || ''}
**发布时间**: ${data.msg_publish_time_str || ''}
**公众号**: ${data.account_name || ''}
**原文链接**: ${data.msg_link || ''}

---

`;

  function processElement(elem) {
    const $elem = $(elem);
    const tagName = elem.tagName?.toLowerCase();

    if (!tagName) return;

    if (tagName === 'h2') {
      markdown += '\n## ' + $elem.text().trim() + '\n\n';
    } else if (tagName === 'h3') {
      markdown += '\n### ' + $elem.text().trim() + '\n\n';
    } else if (tagName === 'h4') {
      markdown += '\n#### ' + $elem.text().trim() + '\n\n';
    } else if (tagName === 'p') {
      let text = '';
      $elem.contents().each((i, child) => {
        if (child.type === 'text') {
          text += child.data;
        } else if (child.type === 'tag') {
          const $child = $(child);
          if (child.tagName === 'strong' || child.tagName === 'b') {
            text += '**' + $child.text().trim() + '**';
          } else if (child.tagName === 'em' || child.tagName === 'i') {
            text += '*' + $child.text().trim() + '*';
          } else if (child.tagName === 'br') {
            text += '\n';
          } else if (child.tagName === 'a') {
            const href = $child.attr('href') || '';
            const linkText = $child.text().trim();
            text += `[${linkText}](${href})`;
          } else {
            text += $child.text();
          }
        }
      });
      text = text.trim();
      if (text) markdown += text + '\n\n';
    } else if (tagName === 'blockquote') {
      const text = $elem.text().trim();
      if (text) markdown += '> ' + text.replace(/\n/g, '\n> ') + '\n\n';
    } else if (tagName === 'ol') {
      $elem.children('li').each((i, li) => {
        const text = $(li).text().trim();
        if (text) markdown += (i + 1) + '. ' + text + '\n';
      });
      markdown += '\n';
    } else if (tagName === 'ul') {
      $elem.children('li').each((i, li) => {
        const text = $(li).text().trim();
        if (text) markdown += '- ' + text + '\n';
      });
      markdown += '\n';
    } else if (tagName === 'img') {
      const src = $elem.attr('data-src') || $elem.attr('src');
      if (src) markdown += '\n![图片](' + src + ')\n\n';
    } else if (tagName === 'code') {
      const text = $elem.text().trim();
      if (text) markdown += '`' + text + '`';
    } else if (tagName === 'pre' || (tagName === 'section' && $elem.hasClass('code-snippet__fix'))) {
      const codeText = $elem.find('code').text() || $elem.text();
      if (codeText.trim()) {
        markdown += '\n```\n' + codeText.trim() + '\n```\n\n';
      }
    } else if (tagName === 'section' || tagName === 'div' || tagName === 'center' || tagName === 'article') {
      $elem.children().each((i, child) => {
        processElement(child);
      });
    }
  }

  const mainSection = $('section[data-plugin="note-to-mp"]');
  if (mainSection.length) {
    mainSection.children().each((i, child) => {
      processElement(child);
    });
  } else {
    $('body').children().each((i, child) => {
      processElement(child);
    });
    if ($('body').children().length === 0) {
      $.root().children().each((i, child) => {
        processElement(child);
      });
    }
  }

  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown;
}

/**
 * 生成修复后的完整 HTML（data-src -> src）
 * @param {object} data - extract() 返回的 data 对象
 * @returns {string} 完整的 HTML 字符串
 */
function convertToFixedHtml(data) {
  const rawHtml = data.msg_content || '';
  const fixedHtml = rawHtml.replace(/data-src=/g, 'src=');
  return '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>' +
    (data.msg_title || '微信文章') +
    '</title>\n<style>img{max-width:100%;height:auto;}</style>\n</head>\n<body>\n' +
    fixedHtml +
    '\n</body>\n</html>';
}

module.exports = { convertToMarkdown, convertToFixedHtml };
