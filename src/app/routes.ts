import { createHashRouter } from "react-router";

export const router = createHashRouter([
  {
    path: "/",
    lazy: async () => {
      const { Home } = await import("./components/Home");
      return { Component: Home };
    },
  },
  {
    path: "/articles",
    lazy: async () => {
      const { Articles } = await import("./components/Articles");
      return { Component: Articles };
    },
  },
  {
    path: "/articles/:id",
    lazy: async () => {
      const { ArticleDetail } = await import("./components/ArticleDetail");
      return { Component: ArticleDetail };
    },
  },
  {
    path: "/about",
    lazy: async () => {
      const { About } = await import("./components/About");
      return { Component: About };
    },
  },
]);
