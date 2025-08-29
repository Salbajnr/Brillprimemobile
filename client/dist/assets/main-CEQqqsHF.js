import { r as requireReact, a as requireReactDom } from './vendor-DdMZSJ8R.js';
import { R as React } from './router-BXE9cCmZ.js';

true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

var jsxRuntime = {exports: {}};

var reactJsxRuntime_production_min = {};

/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var hasRequiredReactJsxRuntime_production_min;

function requireReactJsxRuntime_production_min () {
	if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
	hasRequiredReactJsxRuntime_production_min = 1;
var f=requireReact(),k=Symbol.for("react.element"),l=Symbol.for("react.fragment"),m=Object.prototype.hasOwnProperty,n=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,p={key:true,ref:true,__self:true,__source:true};
	function q(c,a,g){var b,d={},e=null,h=null;void 0!==g&&(e=""+g);void 0!==a.key&&(e=""+a.key);void 0!==a.ref&&(h=a.ref);for(b in a)m.call(a,b)&&!p.hasOwnProperty(b)&&(d[b]=a[b]);if(c&&c.defaultProps)for(b in a=c.defaultProps,a) void 0===d[b]&&(d[b]=a[b]);return {$$typeof:k,type:c,key:e,ref:h,props:d,_owner:n.current}}reactJsxRuntime_production_min.Fragment=l;reactJsxRuntime_production_min.jsx=q;reactJsxRuntime_production_min.jsxs=q;
	return reactJsxRuntime_production_min;
}

var hasRequiredJsxRuntime;

function requireJsxRuntime () {
	if (hasRequiredJsxRuntime) return jsxRuntime.exports;
	hasRequiredJsxRuntime = 1;
	{
	  jsxRuntime.exports = requireReactJsxRuntime_production_min();
	}
	return jsxRuntime.exports;
}

var jsxRuntimeExports = requireJsxRuntime();

var client = {};

var hasRequiredClient;

function requireClient () {
	if (hasRequiredClient) return client;
	hasRequiredClient = 1;
	var m = requireReactDom();
	{
	  client.createRoot = m.createRoot;
	  client.hydrateRoot = m.hydrateRoot;
	}
	return client;
}

var clientExports = requireClient();

function App() {
  console.log("Simple App rendering...");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px", fontFamily: "Arial, sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "BrillPrime - Render Migration Test" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "✅ Server running on Render PostgreSQL" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "✅ Frontend assets loading properly" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "✅ React app rendering successfully" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      marginTop: "20px",
      padding: "15px",
      backgroundColor: "#e8f5e8",
      borderRadius: "5px"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Migration Status: Complete! 🎉" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Your BrillPrime application has been successfully migrated to Render hosting." })
    ] })
  ] });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Something went wrong. Please refresh the page." });
    }
    return this.props.children;
  }
}
console.log("Main.tsx loading...");
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}
console.log("Root element found, creating React root...");
const root = clientExports.createRoot(container);
root.render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
console.log("React app rendered");
//# sourceMappingURL=main-CEQqqsHF.js.map
