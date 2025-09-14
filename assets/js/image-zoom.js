document.addEventListener('DOMContentLoaded', function() {
  // Create modal elements
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.innerHTML = `
    <div class="image-modal-content">
      <span class="image-modal-close">&times;</span>
      <img class="image-modal-img" src="" alt="">
      <div class="image-modal-caption"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('.image-modal-img');
  const modalCaption = modal.querySelector('.image-modal-caption');
  const closeBtn = modal.querySelector('.image-modal-close');

  // Add click listeners to all images in post content
  const contentImages = document.querySelectorAll('.post-content img, article img, .page-content img');

  contentImages.forEach(function(img) {
    // Make images clickable
    img.style.cursor = 'pointer';
    img.title = 'Click to zoom';

    img.addEventListener('click', function() {
      modal.style.display = 'block';
      modalImg.src = this.src;
      modalImg.alt = this.alt;
      modalCaption.textContent = this.alt || this.title || 'Image';
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
  });

  // Close modal when clicking the X
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  // Close modal when clicking outside the image
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});