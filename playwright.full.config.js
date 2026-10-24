import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

export default defineConfig({
  ...base,
  projects: base.projects.map((project) => ({ ...project, grep: /.*/ })),
});
