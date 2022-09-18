import PropTypes from "prop-types";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { HttpApiContext } from "./HttpApiConfiguration";

import "whatwg-fetch";

const serializePayloadIfNeeded = (payload) => {
  if (
    typeof payload !== "object" ||
    payload instanceof Blob ||
    payload instanceof FormData ||
    payload instanceof URLSearchParams
  ) {
    return payload;
  }
  return JSON.stringify(payload);
};

const payloadContentType = (payload) => {
  if (typeof payload === "object") {
    if (payload instanceof Blob) {
      return payload.type;
    } else if (payload instanceof FormData) {
      return "multipart/form-data";
    } else if (payload instanceof URLSearchParams) {
      return "application/x-www-form-urlencoded";
    }
    return "application/json";
  }
  return "text/plain";
};

const getContent = async (resp) => {
  const [contentType] = (resp.headers.get("content-type") ?? "").split(";");
  switch (contentType) {
    case "multipart/form-data":
      return await resp.formData();
    case "text/plain":
      return await resp.text();
    case "application/json":
      return await resp.json();
  }
  return await resp.blob();
};

const useMounted = () => {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
};

const HttpEndpoint = forwardRef(
  (
    {
      url,
      verb = "GET",
      fetchParams = {},
      autoLoad = false,
      onBeforeRequest,
      onHttpOk,
      onHttpError,
      onFailure,
      onFinally,
    },
    ref
  ) => {
    const mounted = useMounted();
    const { baseUrl: contextBaseUrl, fetchParams: contextFetchParams } =
      useContext(HttpApiContext);

    // GET or HEAD : URL params as single argument
    // others verbs : payload as first argument, URL params as second
    const fetchData = useRef(async (...args) => {
      try {
        let params;
        let payload;
        if (verb === "GET" || verb === "HEAD") {
          [params] = args;
        } else {
          [payload, params] = args;
        }
        let completeUrl = [contextBaseUrl, url].filter(Boolean).join("");
        Object.entries(params ?? {}).forEach(([name, value]) => {
          completeUrl = completeUrl.replace(`{${name}}`, value);
        });
        if (typeof onBeforeRequest === "function") {
          onBeforeRequest(...args);
        }
        const response = await window.fetch(completeUrl, {
          ...contextFetchParams,
          ...fetchParams,
          headers: {
            "Content-Type": payloadContentType(payload),
            ...(contextFetchParams?.headers ?? {}),
            ...(fetchParams?.headers ?? {}),
          },
          method: verb,
          body: serializePayloadIfNeeded(payload),
        });
        const content = await getContent(response);
        if (response.ok) {
          if (mounted.current && typeof onHttpOk === "function") {
            onHttpOk(content, response, ...args);
          }
        } else {
          if (mounted.current && typeof onHttpError === "function") {
            onHttpError(content, response, ...args);
          }
        }
      } catch (e) {
        if (mounted.current && typeof onFailure === "function") {
          onFailure(e, ...args);
        }
      } finally {
        if (mounted.current && typeof onFinally === "function") {
          onFinally(...args);
        }
      }
    });

    useEffect(() => {
      if (autoLoad) {
        if (Array.isArray(autoLoad)) {
          fetchData.current(...autoLoad);
        } else if (typeof autoLoad === "object") {
          fetchData.current(autoLoad);
        } else {
          fetchData.current();
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(autoLoad)]);

    useImperativeHandle(ref, () => ({
      fetch: fetchData.current,
    }));

    return null;
  }
);

HttpEndpoint.propTypes = {
  url: PropTypes.string.isRequired,
  name: PropTypes.string,
  verb: PropTypes.string,
  fetchParams: PropTypes.object,
  autoLoad: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
    PropTypes.array,
  ]),
  onBeforeRequest: PropTypes.func,
  onHttpOk: PropTypes.func,
  onHttpError: PropTypes.func,
  onFailure: PropTypes.func,
  onFinally: PropTypes.func,
};

HttpEndpoint.displayName = "HttpEndpoint";

export default HttpEndpoint;
