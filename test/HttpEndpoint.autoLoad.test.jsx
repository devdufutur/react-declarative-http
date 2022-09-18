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
import { setupServer } from "msw/node";
import { rest } from "msw";

import HttpEndpoint from "../src/HttpEndpoint";
import { useState } from "react";

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

describe("HttpEndpoint with autoLoad", () => {
  test("Simple GET request, without any parameter, HTTP 200", async () => {
    const TestComponent = () => {
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/characters/anime"
            onHttpOk={setPeople}
            autoLoad
          />
          <ul>
            {people.map(({ name }) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      );
    };
    render(<TestComponent />);

    const list = await screen.findByRole("list");
    expect(list).toBeInTheDocument();

    expect(await within(list).findByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Homer Simpson/i)).toBeInTheDocument();
    expect(within(list).getByText(/Stan Smith/i)).toBeInTheDocument();
  });

  test("Simple GET request, with URL parameters, HTTP 200", async () => {
    const TestComponent = () => {
      const [person, setPerson] = useState();
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/characters/{type}/{id}"
            onHttpOk={setPerson}
            autoLoad={{ type: "anime", id: 1 }}
          />
          {person && <div>{person.name}</div>}
        </>
      );
    };
    render(<TestComponent />);

    expect(await screen.findByText(/Homer Simpson/i)).toBeInTheDocument();
  });

  test("Simple GET request, without any parameter, HTTP 404", async () => {
    const TestComponent = () => {
      const [error, setError] = useState();
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/not_found"
            onHttpError={setError}
            autoLoad
          />
          {error && <p>Error : {error}</p>}
        </>
      );
    };
    render(<TestComponent />);

    expect(await screen.findByText(/Error : Not found/i)).toBeInTheDocument();
  });

  test("Simple GET request, without any parameter, request failed", async () => {
    const TestComponent = () => {
      const [error, setError] = useState();
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="http://foo.bar/api"
            onFailure={(e) => setError(e.message)}
            autoLoad
          />
          {error && <p>Error : {error}</p>}
        </>
      );
    };
    render(<TestComponent />);

    expect(
      await screen.findByText(/Error : Network request failed/i)
    ).toBeInTheDocument();
  });

  test("Simple POST request, with payload, without query parameter, HTTP 200", async () => {
    const TestComponent = () => {
      const [result, setResult] = useState();
      return (
        <>
          <HttpEndpoint
            verb="POST"
            url="/api/characters"
            onHttpOk={setResult}
            autoLoad={{name: "Peter Griffin"}}
          />
          {result && result.ok && <div>{result.name} created !</div>}
        </>
      );
    };
    render(<TestComponent />);

    expect(
      await screen.findByText(/Peter Griffin created !/i)
    ).toBeInTheDocument();
  });

  test("Simple PUT request, with payload, with query parameters, HTTP 200", async () => {
    const TestComponent = () => {
      const [name, setName] = useState();
      const [result, setResult] = useState();
      return (
        <>
          <HttpEndpoint
            verb="PUT"
            url="/api/characters/{type}/{id}"
            onHttpOk={setResult}
            autoLoad={[{name: "John Dorian"}, { type: "live", id: 4 }]}
          />
          {result && result.ok && (
            <div>
              {result.name} created, type={result.type}, id={result.id} !
            </div>
          )}
        </>
      );
    };
    render(<TestComponent />);

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
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/characters/anime"
            autoLoad
            {...callbacks}
          />
        </>
      );
    };
    render(<TestComponent />);

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
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/not_found"
            autoLoad
            {...callbacks}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
        </>
      );
    };
    render(<TestComponent />);

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
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="http://foo.bar/api"
            autoLoad
            {...callbacks}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
        </>
      );
    };
    render(<TestComponent />);

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
      return (
        <>
          <HttpEndpoint
            verb="GET"
            url="/api/characters/{type}"
            autoLoad={[{ type: "anime" }, "foo", "bar"]}
            {...callbacks}
          />
        </>
      );
    };
    render(<TestComponent />);

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
});
