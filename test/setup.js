import "@testing-library/jest-dom";
import { configure } from "@testing-library/react/pure";

configure({ asyncUtilTimeout: 5000, defaultHidden: true });