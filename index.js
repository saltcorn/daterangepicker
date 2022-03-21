const {
  input,
  div,
  text,
  script,
  domReady,
  text_attr,
} = require("@saltcorn/markup/tags");
const range_filter = require("./date-range-filter");
const headers = [
  {
    script: "/plugins/public/daterangepicker/moment.min.js",
  },
  {
    script: "/plugins/public/daterangepicker/daterangepicker.min.js",
  },
  {
    css: "/plugins/public/daterangepicker/daterangepicker.css",
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "daterangepicker",
  headers,
  viewtemplates: [range_filter],
};
