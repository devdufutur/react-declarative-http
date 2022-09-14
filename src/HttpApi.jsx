import React, {
  cloneElement,
  forwardRef,
  isValidElement,
  useImperativeHandle,
  useRef,
  Children,
  useContext,
} from "react";
import PropTypes from "prop-types";
import { HttpApiContext } from "./HttpApiConfiguration";

import "whatwg-fetch";

const HttpApi = forwardRef(({ baseUrl, fetchParams = {}, children }, ref) => {
  const refEndpoints = useRef({});

  const { baseUrl: contextBaseUrl, fetchParams: contextFetchParams = {} } =
    useContext(HttpApiContext);

  useImperativeHandle(ref, () =>
    Object.fromEntries(
      Children.map(children, (element) => element)
        .filter((element) => isValidElement(element))
        .filter((element) => element.type.displayName === "HttpEndpoint")
        .map((element) => [
          element.props.name,
          refEndpoints.current[element.props.name].fetch,
        ])
        .filter(Boolean)
    )
  );

  // get refs to call imperative handle from endpoints
  return (
    <HttpApiContext.Provider
      value={{
        baseUrl: baseUrl ?? contextBaseUrl,
        fetchParams: { ...contextFetchParams, ...fetchParams },
      }}
    >
      {Children.map(children, (element) => element)
        .filter((element) => isValidElement(element))
        .filter((element) => element.type.displayName === "HttpEndpoint")
        .map((element) =>
          cloneElement(element, {
            ref: (ref) => (refEndpoints.current[element?.props?.name] = ref),
          })
        )}
    </HttpApiContext.Provider>
  );
});

HttpApi.propTypes = {
  baseUrl: PropTypes.string,
  children: PropTypes.any,
  fetchParams: PropTypes.object,
};

HttpApi.displayName = "HttpApi";

export default HttpApi;
