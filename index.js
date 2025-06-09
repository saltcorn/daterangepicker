const headers = [
  {
    script: `/plugins/public/daterangepicker@${
        require("./package.json").version
      }/moment.min.js`,
  },
  {
    script: `/plugins/public/daterangepicker@${
        require("./package.json").version
      }/daterangepicker.min.js`,
  },
  {
    css: `/plugins/public/daterangepicker@${
        require("./package.json").version
      }/daterangepicker.css`,
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "daterangepicker",
  headers,
  viewtemplates: [require("./date-range-filter")],
};
