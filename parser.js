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

function getCategoryType(url) {
    if (url.includes('hinkali-zharenye')) return 'жареные';
    if (url.includes('hinkali-otvarnye')) return 'отварные';
    if (url.includes('dlya-detey')) return 'детское';
    if (url.includes('hachapuri')) return 'хачапури';
    if (url.includes('sousy')) return 'соусы';
    if (url.includes('garniry')) return 'гарниры';
    if (url.includes('salaty')) return 'салаты';
    if (url.includes('goryachie-zakuski')) return 'горячие закуски';
    if (url.includes('supy')) return 'супы';
    if (url.includes('goryachie-blyuda')) return 'горячие блюда';
    if (url.includes('deserty')) return 'десерты';
    if (url.includes('napitki')) return 'напитки';
    
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    const seenNames = new Set();
    let allProducts = [];

    for (const category of categories) {
        const url = category.url.trim();
        logCategoryHeader(url);

        const categoryType = getCategoryType(url);

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('.production__item', { timeout: 15000 });

            const products = await page.evaluate(() => {
                const items = document.querySelectorAll('.production__item');
                const products = [];

                items.forEach((item) => {
                    const nameElement = item.querySelector('.production__item-title');
                    const priceElement = item.querySelector('.price-value');

                    if (!nameElement || !priceElement) return;

                    const name = nameElement.textContent.trim();
                    const priceText = priceElement.textContent.trim();

                    const priceMatch = priceText.match(/\d+/);
                    const price = priceMatch ? parseInt(priceMatch[0], 10) : null;

                    if (!price) return;

                    products.push({ name, price });
                });

                return products;
            });

            for (const product of products) {
                const baseName = product.name;

                    const newName = `${baseName} (${categoryType})`;

                    if (seenNames.has(baseName)) {
                        seenNames.add(newName);
                        allProducts.push({ name: newName, price: product.price });
                    }

                 else {
                    if (!seenNames.has(baseName)) {
                        seenNames.add(baseName);
                        allProducts.push(product);
                    }
                }
            }

            console.log(`Найдено товаров на этой странице: ${products.length}`);
            console.log(`Уникальных товаров всего: ${allProducts.length}`);

        } catch (e) {
            console.error(`Ошибка при парсинге категории "${url}":`, e.message);
        }
    }

    await fs.writeJson('./products.json', allProducts, { spaces: 2 });
    console.log(`Всего уникальных товаров: ${allProducts.length}`);
    console.log('Результат сохранён в файл products.json');

    await browser.close();
})();
