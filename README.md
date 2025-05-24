# Парсер товаров с сайта djari.ru

Этот скрипт автоматически парсит товары с сайта [djari.ru](https://djari.ru/ ) и сохраняет их в формате JSON.

## Описание

Скрипт использует библиотеку [Puppeteer](https://pptr.dev/ ) для работы с браузером Chrome в headless-режиме. Он перебирает указанные категории, собирает информацию о товарах (название и цена) и сохраняет её в файл `products.json`.

## Требования

- Node.js
- npm или yarn

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/your-username/djari-parser.git 
   cd djari-parser
2. Установите зависимости:
    ```bash
    npm install
3. Запустите парсер:
    ```bash
    node parser.js

## Результат
Результат будет записан в файл products.json. Пример:
```
[
  {
    "name": "Хачапури по-аджурски",
    "price": 150
  },
  {
    "name": "Пицца пепперони",
    "price": 320
  }
]

