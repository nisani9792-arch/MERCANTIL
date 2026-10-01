import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.shoppingood.mercantil",
  appName: "מרכנפיל",
  webDir: "public",
  server: {
    url: "https://mercantil.shoppingood.app",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0b1728",
  },
};

export default config;
