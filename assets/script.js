const progress = document.querySelector('.progress');
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

function updateProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const percent = height > 0 ? (scrollTop / height) * 100 : 0;
  if (progress) progress.style.width = `${percent}%`;
}
updateProgress();
window.addEventListener('scroll', updateProgress, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
