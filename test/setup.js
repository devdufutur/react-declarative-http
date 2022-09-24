import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, describe, test, expect } from "vitest";
import { configure } from "@testing-library/react/pure";

import { setupServer } from "msw/node";
import { rest } from "msw";

configure({ asyncUtilTimeout: 5000, defaultHidden: true });

globalThis.apiCharacters = {
    anime: [
      { id: "1", name: "Homer Simpson" },
      { id: "2", name: "Randy Marsch" },
      { id: "3", name: "Stan Smith" },
    ],
    live: [
      { id: "1", name: "Dwight Schrute" },
      { id: "2", name: "Ted Mosby" },
      { id: "3", name: "Chandler Bing" },
    ],
  };
  
  const mockApi = setupServer(
    rest.get("http://localhost:3000/api/characters/:type", (req, res, ctx) => {
      return res(ctx.json(apiCharacters[req.params.type]));
    }),
    rest.get(
      "http://localhost:3000/api/characters/:type/:id",
      (req, res, ctx) => {
        return res(
          ctx.json(
            apiCharacters[req.params.type].find((c) => c.id === req.params.id)
          )
        );
      }
    ),
    rest.post("http://localhost:3000/api/characters", async (req, res, ctx) => {
      const payload = await req.json();
      return res(ctx.json({ ok: true, name: payload.name }));
    }),
    rest.put(
      "http://localhost:3000/api/characters/:type/:id",
      async (req, res, ctx) => {
        const payload = await req.json();
        return res(
          ctx.json({
            ok: true,
            name: payload.name,
            type: req.params.type,
            id: req.params.id,
          })
        );
      }
    ),
    rest.get("http://localhost:3000/api/not_found", (req, res, ctx) => {
      return res(ctx.status(404), ctx.text("Not found"));
    })
  );
  
  beforeAll(() => {
    mockApi.listen({
      onUnhandledRequest: "error",
    });
    window.location.href = "http://localhost:3000";
  });
  afterEach(() => mockApi.resetHandlers());
  afterAll(() => {
    mockApi.close();
  });