---
layout: page
title: Rust Programming
permalink: /categories/rust/
---

# Rust Programming

<div class="posts">
  {% for post in site.categories['rust'] %}
    <article class="post-preview">
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p class="post-meta">
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %d, %Y" }}</time>
      </p>
      <p>{{ post.excerpt | strip_html | truncatewords: 50 }}</p>
    </article>
  {% endfor %}
</div>