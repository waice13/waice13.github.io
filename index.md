---
layout: home
title: Welcome to Tech Box Box
---

Your tech pit stop for **Data Engineering**, **Rust**, and **F1 Data Analysis**.

## What's Coming Up?

- **Data Engineering** - จะมาลอง Tools ที่เกี่ยวกับ Data Engineer ใหม่ ๆ กัน
- **Rust for Data** - คนอื่นทำ Content ที่มีประโยชน์เกี่ยวกับ DE ไปแล้ว เราเลยจะทำอะไรที่มันเท่แทน
- **F1 Data Analysis** - Real insights from real races, จะเอาข้อมูลต่าง ๆ ที่เกี่ยวกับ F1 มาลองเล่นกันดูครับ
- **Tutorials & Stories** - Learn through engaging narratives

## Latest Posts

<div class="posts">
  {% for post in site.posts limit:5 %}
    <article class="post-preview">
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p class="post-meta">
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %d, %Y" }}</time>
      </p>
      <p>{{ post.excerpt | strip_html | truncatewords: 50 }}</p>
    </article>
  {% endfor %}
</div>
