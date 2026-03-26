import { createHashRouter } from "react-router";
import { Home } from "./components/Home";
import { Articles } from "./components/Articles";
import { About } from "./components/About";
import { ArticleDetail } from "./components/ArticleDetail";

export const router = createHashRouter([
  { path: "/", Component: Home },
  { path: "/articles", Component: Articles },
  { path: "/articles/:id", Component: ArticleDetail },
  { path: "/about", Component: About },
]);
