const quote = ['あのさあ', '？', 'ちがうじゃん'];

const randomIndex = Math.floor(Math.random() * quote.length);

document.querySelector('h1').textContent = quote[randomIndex];
