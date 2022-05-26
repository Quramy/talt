export default {
  extensionsToTreatAsEsm: [".ts", ".mts"],
  globals: {
    "ts-jest": {
      diagnostics: false,
      useESM: true,
    },
  },
  transform: {
    "^.+\\.(mt)?ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^(\\.\\.?/.*)\\.js$": ["$1.ts", "$1.js"],
    "^(\\.\\.?/.*)\\.mjs$": ["$1.mts", "$1.mjs"],
    "^(\\.\\.?/.*)\\.cjs$": ["$1.cts", "$1.cjs"],
  },
  testMatch: ["**/?(*.)+(spec|test).?([mc])[jt]s"],
  testPathIgnorePatterns: ["/node_modules/", "/.rollup.cache/", "\\.d\\.ts$", "lib/.*", "lib_cjs/.*"],
  collectCoverageFrom: ["src/**/*.?([mc])ts", "!src/**/*.test.*"],
  moduleFileExtensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json"],
};
