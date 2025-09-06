const headers = [
  {
    script: `/plugins/public/daterangepicker@${
      require("./package.json").version
    }/moment.min.js`,
    onlyViews: ["Date Range Picker"],
  },
  {
    script: `/plugins/public/daterangepicker@${
      require("./package.json").version
    }/daterangepicker.min.js`,
    onlyViews: ["Date Range Picker"],
  },
  {
    css: `/plugins/public/daterangepicker@${
      require("./package.json").version
    }/daterangepicker.css`,
    onlyViews: ["Date Range Picker"],
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "daterangepicker",
  headers,
  viewtemplates: [require("./date-range-filter")],
};
