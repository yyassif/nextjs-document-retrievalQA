import { Database } from "./database.types";

export {};

declare module "*.jpg";
declare module "*.png";
declare module "*.woff2";
declare module "*.woff";
declare module "*.ttf";
declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}
declare module "*.svg";

declare global {
  interface SupaTypes extends Database {}
  interface Window {
    MathJax?: {
      tex: {
        inlineMath: Array<Array<string>>;
        packages: { "[+]": Array<string> };
        color: {
          padding: string;
          borderWidth: string;
        };
      };
      loader: { load: Array<string> };
      typesetClear(): void;
      typesetPromise(): Promise<void>;
    };
  }
}
