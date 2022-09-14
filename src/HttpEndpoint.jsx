import PropTypes from "prop-types";
import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { HttpApiContext } from "./HttpApiConfiguration";

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
      verb,
      url,
      fetchParams = {},
      autoLoad = false,
      onBeforeRequest,
      onHttpOk,
      onHttpError,
      onFailure,
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
        const res = await window.fetch(completeUrl, {
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
        const content = await getContent(res);
        if (res.ok) {
          if (mounted.current && typeof onHttpOk === "function") {
            onHttpOk(content, ...args);
          }
        } else {
          if (mounted.current && typeof onHttpError === "function") {
            onHttpError(content, ...args);
          }
        }
      } catch (e) {
        if (mounted.current && typeof onFailure === "function") {
          onFailure(e, ...args);
        }
      }
    });

    useEffect(() => {
      if (autoLoad) {
        fetchData.current(autoLoad);
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
  name: PropTypes.string.isRequired,
  verb: PropTypes.string.isRequired,
  url: PropTypes.string,
  fetchParams: PropTypes.object,
  autoLoad: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  onBeforeRequest: PropTypes.func,
  onHttpOk: PropTypes.func,
  onHttpError: PropTypes.func,
  onFailure: PropTypes.func,
};

HttpEndpoint.displayName = "HttpEndpoint";

export default HttpEndpoint;
