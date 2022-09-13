import PropTypes from "prop-types";
import { createContext } from "react";

export const HttpApiContext = createContext({});

const HttpApiConfigurator = ({ baseUrl, fetchParams = {}, children }) => {
  return <HttpApiContext.Provider value={{ baseUrl, fetchParams }}>{children}</HttpApiContext.Provider>;
};

HttpApiConfigurator.propTypes = {
  baseUrl: PropTypes.string,
  fetchParams: PropTypes.object,
  children: PropTypes.any,
};

export default HttpApiConfigurator;
