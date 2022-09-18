import { beforeAll, afterEach, afterAll, describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { rest } from "msw";

import HttpApi from "../src/HttpApi";
import HttpEndpoint from "../src/HttpEndpoint";
import { useRef, useState } from "react";

const apiCharacters = {
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

describe("HttpApi", () => {
  test("Named endpoint should be called", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpApi ref={httpApi}>
            <HttpEndpoint
              name="saveCharacter"
              verb="PUT"
              url="/api/characters/{type}/{id}"
            />
            <HttpEndpoint
              name="getCharactersOfType"
              verb="GET"
              url="/api/characters/{type}"
              onHttpOk={setPeople}
            />
          </HttpApi>
          <button
            onClick={() =>
              httpApi.current.getCharactersOfType({ type: "anime" })
            }
          >
            Fetch
          </button>
          <ul>
            {people.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    const list = await screen.findByRole("list");
    expect(list).toBeInTheDocument();

    expect(await within(list).findByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Stan Smith/i)).toBeInTheDocument();
  });

  test("baseUrl should be concatenated with endpoint url", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpApi ref={httpApi} baseUrl="/api/characters">
            <HttpEndpoint
              name="saveCharacter"
              verb="PUT"
              url="/{type}/{id}"
            />
            <HttpEndpoint
              name="getCharactersOfType"
              verb="GET"
              url="/{type}"
              onHttpOk={setPeople}
            />
          </HttpApi>
          <button
            onClick={() =>
              httpApi.current.getCharactersOfType({ type: "anime" })
            }
          >
            Fetch
          </button>
          <ul>
            {people.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    const list = await screen.findByRole("list");
    expect(list).toBeInTheDocument();

    expect(await within(list).findByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Stan Smith/i)).toBeInTheDocument();
  });
});
