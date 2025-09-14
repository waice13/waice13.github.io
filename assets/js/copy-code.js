document.addEventListener('DOMContentLoaded', function() {
  // Add copy button to all code blocks
  const codeBlocks = document.querySelectorAll('pre code, .highlight pre');

  codeBlocks.forEach(function(codeBlock) {
    const pre = codeBlock.tagName === 'PRE' ? codeBlock : codeBlock.parentNode;

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code-btn';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');

    // Create wrapper div if not exists
    if (!pre.parentNode.classList.contains('code-block-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(copyButton);
    } else {
      pre.parentNode.appendChild(copyButton);
    }

    // Add click event
    copyButton.addEventListener('click', function() {
      const code = codeBlock.textContent || codeBlock.innerText;

      navigator.clipboard.writeText(code).then(function() {
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');

        setTimeout(function() {
          copyButton.textContent = 'Copy';
          copyButton.classList.remove('copied');
        }, 2000);
      }).catch(function(err) {
        console.error('Failed to copy: ', err);
        copyButton.textContent = 'Failed';
        setTimeout(function() {
          copyButton.textContent = 'Copy';
        }, 2000);
      });
    });
  });
});