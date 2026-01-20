export const siteData = {
  meta: {
    name: "Becker & Associates",
    twitterHandle: "@becker_corp",
  },
  contact: {
    email: "info@becker-corp.com",
    phone: "+34123456789",
    whatsapp: "34123456789",
    address: "Calle Ficticia 123, 29602 Marbella, España",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3208.706176582531!2d-4.887926884719875!3d36.51205897999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7327eb5c8e3a51%3A0x4d0d0b7d3b2b7a0!2sMarbella!5e0!3m2!1sen!2ses!4v1678886400000!5m2!1sen!2ses",
  },
  socials: {
    linkedin: "https://linkedin.com/company/becker",
    xing: "https://xing.com/pages/becker",
  },
  navigation: [
    // { key: "services", routeKey: "services" },
    { key: "home", routeKey: "home" },
    { key: "about", routeKey: "about" },
    // { key: "blog", routeKey: "blog" },
    { key: "contact", routeKey: "contact" },
  ],
} as const;
