module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  collectCoverageFrom: ["src/**/*.{ts,js}"]
}