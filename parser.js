const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// выбор города (msk, kirov)
const CITY = 'msk';

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
    console.log(`https://djari.ru/${CITY}`)
    await page.goto(`https://djari.ru/${CITY}`, {waitUntil: 'load'});
    

    console.log('Собираем категории с главной страницы...');
    await page.waitForSelector('a.filter-category__item', { timeout: 15000 });

    const categoryUrls = await page.evaluate((CITY) => {
        const links = [];
        const anchors = document.querySelectorAll('a.filter-category__item');

        anchors.forEach(a => {
            const href = a.getAttribute('href');

            // исключаем катеорию popular, тк там очевидно повторы
            if (href && href.startsWith(`/${CITY}/`) && !href.includes("popular")) {
                links.push(`https://djari.ru${href}`);
            }
        });

        return links;
    }, CITY);

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

async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-cache',
            '--disable-application-cache',
            '--disable-offline-load-stale-cache',
        ]
    });
    browser.deleteCookie()

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/136.0.0.0 Safari/537.36');

    const categories = await getCategories(page);

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

                if (seenNames.has(baseName) && !seenNames.has(newName)) {
                    seenNames.add(newName);
                    allProducts.push({ name: newName, price: product.price });
                } else if (!seenNames.has(baseName)) {
                    seenNames.add(baseName);
                    allProducts.push(product);
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
}

main();
