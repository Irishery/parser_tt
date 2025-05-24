const fs = require('fs-extra');
const puppeteer = require('puppeteer');

const categories = [
  { url: 'https://djari.ru/kirov/hachapuri' },
  { url: 'https://djari.ru/kirov/hinkali-otvarnye' },
  { url: 'https://djari.ru/kirov/hinkali-zharenye' },
  { url: 'https://djari.ru/kirov/sousy' },
  { url: 'https://djari.ru/kirov/garniry' },
  { url: 'https://djari.ru/kirov/salaty' },
  { url: 'https://djari.ru/kirov/goryachie-zakuski' },
  { url: 'https://djari.ru/kirov/supy' },
  { url: 'https://djari.ru/kirov/goryachie-blyuda' },
  { url: 'https://djari.ru/kirov/deserty' },
  { url: 'https://djari.ru/kirov/dlya-detey' },
  { url: 'https://djari.ru/kirov/napitki' },
];

// чтобы логи красивые были
function logCategoryHeader(categoryUrl) {
    const maxLength = 100;
    const prefix = ' Парсим категорию: ';
    const fullText = prefix + categoryUrl;

    if (fullText.length > maxLength) {
        console.log(`Слишком длинная ссылка: ${categoryUrl}`);
        console.log(fullText);
        return;
    }

    const padding = maxLength - fullText.length;
    const leftPad = '-'.repeat(Math.floor(padding / 2));
    const rightPad = '-'.repeat(Math.ceil(padding / 2));

    console.log(`${leftPad}${fullText}${rightPad}`);
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    const seenNames = new Set();
    let allProducts = [];

    for (const category of categories) {
        logCategoryHeader(category.url);

        // есть несколько товаров с одинаковым названием, но разным типом приготовления - им ставлю тэг в виде категории
        let categoryType = '';
        if (category.url.includes('hinkali-zharenye')) {
            categoryType = 'zharen';
        } else if (category.url.includes('hinkali-otvarnye')) {
            categoryType = 'otvar';
        } else if (category.url.includes('detey')) {
            categoryType = 'deti';
        }

        try {
            await page.goto(category.url, { waitUntil: 'networkidle2' });

            await page.waitForSelector('.production__item', { timeout: 10000 });

            const products = await page.evaluate(categoryType => {
                const items = document.querySelectorAll('.production__item');
                const products = [];
            
                items.forEach((item) => {
                    const nameElement = item.querySelector('.production__item-title');
                    const priceElement = item.querySelector('.price-value');
            
                    if (!nameElement || !priceElement) return;
            
                    let name = nameElement.textContent.trim();
            
                    if (categoryType === 'zharen') {
                        name += ' (жареные)';
                    } else if (categoryType === 'otvar') {
                        name += ' (отварные)';
                    } else if (categoryType === 'deti') {
                        name += ' (детскоe)';
                    }
            
                    const priceText = priceElement.textContent.trim();
            
                    const priceMatch = priceText.match(/\d+/);
                    const price = priceMatch ? parseInt(priceMatch[0], 10) : null;
            
                    if (!price) return;
            
                    products.push({ name, price });
                });
            
                return products;
            }, categoryType);

            for (const product of products) {
                if (!seenNames.has(product.name)) {
                    seenNames.add(product.name);
                    allProducts.push(product);
                }
            }

            console.log(`Найдено товаров на этой странице: ${products.length}`);
            console.log(`Уникальных товаров всего: ${allProducts.length}`);
        } catch (e) {
            console.error(`Ошибка при парсинге категории "${category.url}":`, e.message);
        }
    }

    await fs.writeJson('./products.json', allProducts, { spaces: 2 });
    console.log(`Всего уникальных товаров: ${allProducts.length}`);
    console.log('Результат сохранён в файл products.json');

    await browser.close();
})();
