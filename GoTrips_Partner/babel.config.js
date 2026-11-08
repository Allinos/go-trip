module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            components: "./src/components",
            screens: "./src/screens",
            assets: "./assets",
            navigation: "./src/navigation",
            context: "./src/context",
            api: "./src/api",
            services: "./src/services",
          },
        },
      ],
    ],
  };
};