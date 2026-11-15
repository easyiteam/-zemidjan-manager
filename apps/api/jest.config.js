/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/test/**/*.spec.ts"],
  maxWorkers: 1,
  testTimeout: 30000,
  globalSetup: "<rootDir>/test/global-setup.cjs",
  globalTeardown: "<rootDir>/test/global-teardown.cjs",
  setupFiles: ["<rootDir>/test/jest.env.cjs"],
};
