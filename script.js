const button = document.querySelector('.celebrate-button');
const colors = ['#e7654f', '#e5ad47', '#173d36', '#f0c9a5'];

button.addEventListener('click', () => {
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.style.left = `${50 + (Math.random() - 0.5) * 18}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 340}px`);
    piece.style.setProperty('--y', `${80 + Math.random() * 260}px`);
    piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    piece.style.transform = `rotate(${Math.random() * 90}deg)`;
    document.querySelector('.celebration').append(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
});
