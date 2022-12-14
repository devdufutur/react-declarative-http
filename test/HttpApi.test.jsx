import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HttpApi from "../src/HttpApi";
import HttpEndpoint from "../src/HttpEndpoint";
import { useRef, useState } from "react";

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

  test("HttpApi baseUrl should be concatenated with HttpEndpoint url", async () => {
    const TestComponent = () => {
      const httpApi = useRef();
      const [people, setPeople] = useState([]);
      return (
        <>
          <HttpApi ref={httpApi} baseUrl="/api/characters">
            <HttpEndpoint name="saveCharacter" verb="PUT" url="/{type}/{id}" />
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

  test("HttpApi fetchParams should be passed to fetch", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");
    const TestComponent = () => {
      const httpApi = useRef();
      return (
        <>
          <HttpApi
            ref={httpApi}
            fetchParams={{
              credentials: "include",
              headers: { "X-Test-OK": 1 },
            }}
          >
            <HttpEndpoint
              name="getCharacters"
              verb="GET"
              url="/api/characters/{type}"
            />
          </HttpApi>
          <button
            onClick={() => httpApi.current.getCharacters({ type: "anime" })}
          >
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

  test("HttpApi & HttpEndpoint fetchParams should be merged", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");
    const TestComponent = () => {
      const httpApi = useRef();
      return (
        <>
          <HttpApi
            ref={httpApi}
            fetchParams={{
              credentials: "include",
              headers: { "X-Test-Http-Api-OK": 1 },
            }}
          >
            <HttpEndpoint
              name="getCharacters"
              verb="GET"
              url="/api/characters/{type}"
              fetchParams={{
                headers: { "X-Test-Http-Endpoint-OK": 1 },
              }}
            />
          </HttpApi>
          <button
            onClick={() => httpApi.current.getCharacters({ type: "anime" })}
          >
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
        headers: expect.objectContaining({
          "X-Test-Http-Api-OK": 1,
          "X-Test-Http-Endpoint-OK": 1,
        }),
      })
    );
  });

  test("HttpEndpoint fetchParams should override HttpApi fetchParams", async () => {
    const spiedFetch = vi.spyOn(global, "fetch");
    const TestComponent = () => {
      const httpApi = useRef();
      return (
        <>
          <HttpApi
            ref={httpApi}
            fetchParams={{
              credentials: "include",
              headers: { "X-Test-OK": 1 },
            }}
          >
            <HttpEndpoint
              name="getCharacters"
              verb="GET"
              url="/api/characters/{type}"
              fetchParams={{
                headers: { "X-Test-OK": 2 },
              }}
            />
          </HttpApi>
          <button
            onClick={() => httpApi.current.getCharacters({ type: "anime" })}
          >
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
        headers: expect.objectContaining({
          "X-Test-OK": 2,
        }),
      })
    );
  });
});
