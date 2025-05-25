const fs = require('fs-extra');
const puppeteer = require('puppeteer');


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

// определение типа категории
function getCategoryType(url) {
    const match = url.match(/([^/]+)$/);
    if (!match || !match[1]) return null;

    const slug = match[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    return slug;
}

// парсинг категорий с главной страницы
async function getCategories(page) {
    await page.goto('https://djari.ru/kirov', { waitUntil: 'networkidle2' });

    console.log('Собираем категории с главной страницы...');

    const categoryUrls = await page.evaluate(() => {
        const links = [];
        const anchors = document.querySelectorAll('a.filter-category__item');

        anchors.forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.startsWith('/kirov/') && !href.includes("popular")) {
                links.push('https://djari.ru' + href);
            }
        });

        return links;
    });

    console.log(`Найдено категорий: ${categoryUrls.length}`);
    console.log(categoryUrls.join('\n'));

    return categoryUrls;
}

// парсинг товаров со страницы
async function parseProductsFromPage(page) {
    return await page.evaluate(() => {
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
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

    categories = await getCategories(page);

    const seenNames = new Set();
    let allProducts = [];

    for (const url of categories) {
        const trimmedUrl = url.trim();
        const categoryType = getCategoryType(trimmedUrl);

        logCategoryHeader(trimmedUrl);

        try {
            await page.goto(trimmedUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('.production__item', { timeout: 15000 });

            const products = await parseProductsFromPage(page);

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
            console.error(`Ошибка при парсинге категории "${trimmedUrl}":`, e.message);
        }
    }

    await fs.writeJson('./products.json', allProducts, { spaces: 2 });
    console.log(`Всего уникальных товаров: ${allProducts.length}`);
    console.log('Результат сохранён в файл products.json');

    await browser.close();
})();
