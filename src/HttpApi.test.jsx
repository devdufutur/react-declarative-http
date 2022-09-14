import { beforeAll, afterEach, afterAll, describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { rest } from "msw";

import HttpApi from "./HttpApi";
import HttpEndpoint from "./HttpEndpoint";
import { useRef, useState } from "react";

const mockApi = setupServer(
  rest.get("http://localhost:3000/api/list", (req, res, ctx) => {
    return res(
      ctx.json([
        { name: "Homer Simpson" },
        { name: "Randy Marsch" },
        { name: "Stan Smith" },
      ])
    );
  }),
  rest.get("http://localhost:3000/api/lisst", (req, res, ctx) => {
    return res(ctx.status(400), ctx.text("Not found"));
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
  test("Simple GET request, without any parameter, HTTP 200", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpApi ref={httpApi}>
            <HttpEndpoint
              name="getPeople"
              verb="GET"
              url="/api/list"
              onHttpOk={setPeople}
            />
          </HttpApi>
          <button onClick={() => httpApi.current.getPeople()}>Fetch</button>
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

  test("Simple GET request, without any parameter, HTTP 404", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [error, setError] = useState();
      return (
        <>
          <HttpApi ref={httpApi}>
            <HttpEndpoint
              name="getPeople"
              verb="GET"
              url="/api/lisst"
              onHttpError={setError}
            />
          </HttpApi>
          <button onClick={() => httpApi.current.getPeople()}>Fetch</button>
          {error && <p>Error : {error}</p>}
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(await screen.findByText(/Error : Not found/i)).toBeInTheDocument();
  });

  test("Simple GET request, without any parameter, request failed", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [error, setError] = useState();
      return (
        <>
          <HttpApi ref={httpApi}>
            <HttpEndpoint
              name="getPeople"
              verb="GET"
              url="/api/lisst"
              onHttpError={setError}
            />
          </HttpApi>
          <button onClick={() => httpApi.current.getPeople()}>Fetch</button>
          {error && <p>Error : {error}</p>}
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(
      await screen.findByText(/Error : Network request failed/i)
    ).toBeInTheDocument();
  });
});
