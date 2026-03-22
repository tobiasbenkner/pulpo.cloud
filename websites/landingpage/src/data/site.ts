export const siteData = {
  meta: {
    name: "Pulpo",
    domain: "pulpo.cloud",
    url: "https://pulpo.cloud",
  },
  contact: {
    email: "info@pulpo.cloud",
    whatsapp: "+34624156091",
  },
  pricing: {
    currency: "€",
    overage: 0.02,
    plans: [
      { key: "free", invoices: 100, price: 0 },
      { key: "starter", invoices: 500, price: 19 },
      { key: "business", invoices: 2000, price: 39 },
      { key: "growth", invoices: 5000, price: 69 },
      { key: "scale", invoices: 8000, price: 99 },
    ],
  },
};
