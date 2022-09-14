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
  }),
  // évt classé
  rest.get(
    "http://localhost:3000/api/sinistres/M333333333H",
    (req, res, ctx) => {
      return res(
        ctx.status(400),
        ctx.json({
          message: "Mission REN impossible - Evènement classé",
        })
      );
    }
  ),
  // évt initié
  rest.get(
    "http://localhost:3000/api/sinistres/M220455143J",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message: "Mission REN impossible - Evènement initié",
        })
      );
    }
  ),
  // évt non répertorié
  rest.get(
    "http://localhost:3000/api/sinistres/M444444444J",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message: "Evénement non répertorié",
        })
      );
    }
  ),
  // évt refus prise en charge
  rest.get(
    "http://localhost:3000/api/sinistres/M220466249T",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message: "Mission REN impossible - Evénement RPC",
        })
      );
    }
  ),
  // évt lieu sinistré à l'étranger
  rest.get(
    "http://localhost:3000/api/sinistres/M220493739B",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message: "Mission REN impossible - Lieu sinistré à l'étranger",
        })
      );
    }
  ),
  // évt lieu sinistré armée
  rest.get(
    "http://localhost:3000/api/sinistres/M220469573P",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message:
            "Mission REN impossible - Lieu sinistré ARMEES (Zone Franche Activités)",
        })
      );
    }
  ),
  // évt abscence adresse lieu sinistré
  rest.get(
    "http://localhost:3000/api/sinistres/M220446945D",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message: "Mission REN impossible - Absence adresse lieu sinistré",
        })
      );
    }
  ),
  //évt sans REN/RDF
  rest.get(
    "http://localhost:3000/api/sinistres/M220519133J",
    (req, res, ctx) => {
      return res(
        ctx.status(404),
        ctx.json({
          message:
            "Mission REN impossible - Absence prestation Réparation En Nature ou Recherche De Fuite acceptée ou en attente",
        })
      );
    }
  ),

  // contrôle de l'autorisation à débrancher sur misren
  rest.post(
    "http://localhost:3000/api/sinistres/estAutoriseDebranchementMisren",
    (req, res, ctx) => {
      return res(ctx.status(204));
    }
  )
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
            url="/api/list"
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

  test("Simple GET request, without any parameter, HTTP 404", async () => {
    const TestComponent = () => {
      const httpEndpoint = useRef();
      const [error, setError] = useState();
      return (
        <>
          <HttpEndpoint
            ref={httpEndpoint}
            verb="GET"
            url="/api/lisst"
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
            url="/api/listt"
            onFailure={(e) => setError(e.message)}
          />
          <button onClick={() => httpEndpoint.current.fetch()}>Fetch</button>
          {error && (
            <p>
              Error : {error}
            </p>
          )}
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
