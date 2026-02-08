import type { Product } from "../types/shop";

// Kategorien
export const categories = [
  "Alle",
  "Kleidung",
  "Snacks",
  "Getränke",
  "Aktionen",
  "Gutscheine",
];

// Demo Produkte mit Stock
export const products: Product[] = [
  {
    id: "1",
    name: "T-Shirt White",
    priceGross: 24.9,
    taxClass: "STD",
    category: "Kleidung",
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "2",
    name: "Cappuccino",
    priceGross: 3.5,
    taxClass: "RED",
    category: "Getränke",
    stock: 150,
    image:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "3",
    name: "Jeans Classic",
    priceGross: 89.0,
    taxClass: "STD",
    category: "Kleidung",
    stock: 0,
    image:
      "https://images.unsplash.com/photo-1542272617-08f086303294?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "4",
    name: "Croissant",
    priceGross: 2.2,
    taxClass: "RED",
    category: "Snacks",
    stock: 3,
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "5",
    name: "Limonade",
    priceGross: 4.5,
    taxClass: "RED",
    category: "Getränke",
    stock: 42,
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "6",
    name: "Sneaker Limited",
    priceGross: 120.0,
    taxClass: "STD",
    category: "Kleidung",
    stock: 1,
    image:
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "7",
    name: "Wasser 0.5l",
    priceGross: 1.5,
    taxClass: "RED",
    category: "Getränke",
    stock: 200,
    image:
      "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "8",
    name: "Donut Pink",
    priceGross: 1.8,
    taxClass: "RED",
    category: "Snacks",
    stock: 12,
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80",
  },
];