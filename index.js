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
  viewtemplates: [require("./date-range-filter")],
};
