export const siteData = {
  meta: {
    name: "Becker & Associates",
    twitterHandle: "@becker_corp",
  },
  contact: {
    email: "info@beckernet.es",
    phone: "+34 928 297 262",
    whatsapp: "34123456789",
    address: "Cl. León y Castillo 96, 2º-A\n35004 Las Palmas de Gran Canaria",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3519.0454034967684!2d-15.42336282457414!3d28.114647107409862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc40959d1c024811%3A0xc61e32206d154aec!2sBecker24.es!5e0!3m2!1sen!2ses!4v1727336121295!5m2!1sen!2ses",
  },
  navigation: [
    { key: "home", routeKey: "home" },
    { key: "about", routeKey: "about" },
    { key: "Immo News", routeKey: "blog_realestate" },
    { key: "Seguros News", routeKey: "blog_insurance" },
    { key: "contact", routeKey: "contact" },
  ],
} as const;
