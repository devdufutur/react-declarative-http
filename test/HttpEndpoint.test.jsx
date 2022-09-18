import {
  beforeAll,
  afterEach,
  afterAll,
  describe,
  test,
  expect,
  vi,
} from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { rest } from "msw";

import HttpEndpoint from "../src/HttpEndpoint";
import { useRef, useState } from "react";

// import "whatwg-fetch";

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

describe("HttpEndpoint", () => {
  test("Simple GET request, without any parameter, HTTP 200", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/characters/anime"
            onHttpOk={setPeople}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
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

  test("Simple GET request, with URL parameters, HTTP 200", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [person, setPerson] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/characters/{type}/{id}"
            onHttpOk={setPerson}
          />
          <button
            onClick={() => httpEndpoint.current.fetch({ type: "anime", id: 1 })}
          >
            Fetch
          </button>
          {person && <div>{person.name}</div>}
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(await screen.findByText(/Homer Simpson/i)).toBeInTheDocument();
  });

  test("Simple GET request, without any parameter, HTTP 404", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [error, setError] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/not_found"
            onHttpError={setError}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
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
      const httpEndpoint = useRef();
      const [error, setError] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="http://foo.bar/api"
            onFailure={(e) => setError(e.message)}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
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

  test("Simple POST request, with payload, without query parameter, HTTP 200", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [name, setName] = useState();
      const [result, setResult] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="POST"
            url="/api/characters"
            onHttpOk={setResult}
          />
          <label>
            Name
            <input
              type="text"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button onClick={() => httpEndpoint.current.fetch({ name })}>
            Create
          </button>
          {result && result.ok && <div>{result.name} created !</div>}
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("textbox", { name: /Name/i }));
    await userEvent.keyboard("Peter Griffin");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(
      await screen.findByText(/Peter Griffin created !/i)
    ).toBeInTheDocument();
  });

  test("Simple PUT request, with payload, with query parameters, HTTP 200", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [name, setName] = useState();
      const [result, setResult] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="PUT"
            url="/api/characters/{type}/{id}"
            onHttpOk={setResult}
          />
          <label>
            Name
            <input
              type="text"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            onClick={() =>
              httpEndpoint.current.fetch({ name }, { type: "live", id: 4 })
            }
          >
            Create
          </button>
          {result && result.ok && (
            <div>
              {result.name} created, type={result.type}, id={result.id} !
            </div>
          )}
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("textbox", { name: /Name/i }));
    await userEvent.keyboard("John Dorian");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(
      await screen.findByText(/John Dorian created, type=live, id=4 !/i)
    ).toBeInTheDocument();
  });

  test("A request leading to HTTP 200 should trigger only onBeforeRequest, onHttpOk and onFinally", async () => {
    const callbacks = {
      onBeforeRequest: vi.fn(),
      onHttpOk: vi.fn(),
      onHttpError: vi.fn(),
      onFailure: vi.fn(),
      onFinally: vi.fn(),
    };
    const TestComponent = () => {
      const httpEndpoint = useRef();

      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/characters/anime"
            {...callbacks}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(callbacks.onBeforeRequest).toHaveBeenCalledOnce();
    expect(callbacks.onBeforeRequest).toHaveBeenCalledWith();

    await waitFor(() => expect(callbacks.onHttpOk).toHaveBeenCalledOnce());
    expect(callbacks.onHttpOk).toHaveBeenCalledWith(
      apiCharacters.anime,
      expect.objectContaining({ ok: true, status: 200 }) // Response object
    );

    await waitFor(() => expect(callbacks.onFinally).toHaveBeenCalledOnce());
    expect(callbacks.onFinally).toHaveBeenCalledWith();

    expect(callbacks.onHttpError).not.toHaveBeenCalled();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  test("A request leading to HTTP error should trigger only onBeforeRequest, onHttpError and onFinally", async () => {
    const callbacks = {
      onBeforeRequest: vi.fn(),
      onHttpOk: vi.fn(),
      onHttpError: vi.fn(),
      onFailure: vi.fn(),
      onFinally: vi.fn(),
    };
    const TestComponent = () => {
      const httpEndpoint = useRef();

      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/not_found"
            {...callbacks}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(callbacks.onBeforeRequest).toHaveBeenCalledOnce();
    expect(callbacks.onBeforeRequest).toHaveBeenCalledWith();

    await waitFor(() => expect(callbacks.onHttpError).toHaveBeenCalledOnce());
    expect(callbacks.onHttpError).toHaveBeenCalledWith(
      "Not found",
      expect.objectContaining({ ok: false, status: 404 }) // Response object
    );

    await waitFor(() => expect(callbacks.onFinally).toHaveBeenCalledOnce());
    expect(callbacks.onFinally).toHaveBeenCalledWith();

    expect(callbacks.onHttpOk).not.toHaveBeenCalled();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  test("A request leading to failure should trigger only onBeforeRequest, onFailure and onFinally", async () => {
    const callbacks = {
      onBeforeRequest: vi.fn(),
      onHttpOk: vi.fn(),
      onHttpError: vi.fn(),
      onFailure: vi.fn(),
      onFinally: vi.fn(),
    };
    const TestComponent = () => {
      const httpEndpoint = useRef();

      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="http://foo.bar/api"
            {...callbacks}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(callbacks.onBeforeRequest).toHaveBeenCalledOnce();
    expect(callbacks.onBeforeRequest).toHaveBeenCalledWith();

    await waitFor(() => expect(callbacks.onFailure).toHaveBeenCalledOnce());
    expect(callbacks.onFailure).toHaveBeenCalledWith(
      new TypeError("Network request failed")
    );

    await waitFor(() => expect(callbacks.onFinally).toHaveBeenCalledOnce());
    expect(callbacks.onFinally).toHaveBeenCalledWith();

    expect(callbacks.onHttpOk).not.toHaveBeenCalled();
    expect(callbacks.onHttpError).not.toHaveBeenCalled();
  });

  test("Arguments passed to httpApi.current.fetch() method should be passed to all callbacks", async () => {
    const callbacks = {
      onBeforeRequest: vi.fn(),
      onHttpOk: vi.fn(),
      onHttpError: vi.fn(),
      onFailure: vi.fn(),
      onFinally: vi.fn(),
    };
    const TestComponent = () => {
      const httpEndpoint = useRef();

      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/characters/{type}"
            {...callbacks}
          />
          <button
            onClick={() =>
              httpEndpoint.current.fetch({ type: "anime" }, "foo", "bar")
            }
          >
            Fetch
          </button>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(callbacks.onBeforeRequest).toHaveBeenCalledOnce();
    expect(callbacks.onBeforeRequest).toHaveBeenCalledWith(
      { type: "anime" }, // 1st argument passed to httpApi.current.fetch()
      "foo", // 2nd argument passed to httpApi.current.fetch()
      "bar" // 3rd argument passed to httpApi.current.fetch()
    );

    await waitFor(() => expect(callbacks.onHttpOk).toHaveBeenCalledOnce());
    expect(callbacks.onHttpOk).toHaveBeenCalledWith(
      apiCharacters.anime,
      expect.objectContaining({ ok: true, status: 200 }), // Response obejct
      { type: "anime" }, // 1st argument passed to httpApi.current.fetch()
      "foo", // 2nd argument passed to httpApi.current.fetch()
      "bar" // 3rd argument passed to httpApi.current.fetch()
    );

    await waitFor(() => expect(callbacks.onFinally).toHaveBeenCalledOnce());
    expect(callbacks.onFinally).toHaveBeenCalledWith(
      { type: "anime" }, // 1st argument passed to httpApi.current.fetch()
      "foo", // 2nd argument passed to httpApi.current.fetch()
      "bar" // 3rd argument passed to httpApi.current.fetch()
    );

    expect(callbacks.onHttpError).not.toHaveBeenCalled();
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  test("fetchParams should be passed to fetch", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");
    const TestComponent = () => {
      const httpEndpoint = useRef();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/characters/{type}"
            fetchParams={{
              credentials: "include",
              headers: { "X-Test-OK": 1 },
            }}
          />
          <button onClick={() => httpEndpoint.current.fetch({ type: "anime" })}>
            Fetch
          </button>
        </>
      );
    };
    render(<TestComponent />);

    await userEvent.click(screen.getByRole("button", { name: /Fetch/i }));

    expect(spiedFetch).toHaveBeenCalledWith(
      "/api/characters/anime",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "X-Test-OK": 1 }),
      })
    );
  });
});
