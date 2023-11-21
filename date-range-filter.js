const User = require("@saltcorn/data/models/user");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Workflow = require("@saltcorn/data/models/workflow");
const FieldRepeat = require("@saltcorn/data/models/fieldrepeat");

const {
  input,
  div,
  text,
  script,
  domReady,
  text_attr,
  button,
  i,
} = require("@saltcorn/markup/tags");
const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Fields",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const date_fields = fields
            .filter((f) => f.type.name === "Date")
            .map((f) => f.name);
          return new Form({
            fields: [
              {
                name: "date_field",
                label: "Date field",
                type: "String",
                required: true,
                sublabel:
                  "If selecting rows by a beginning and an end, use this for the start field",
                attributes: {
                  options: date_fields.join(),
                },
              },
              {
                name: "end_date_field",
                label: "End date field",
                type: "String",
                sublabel:
                  "Optional. If selecting rows with the beginning and an end, use this for the end field",
                attributes: {
                  options: date_fields.join(),
                },
              },
              {
                name: "fwd_back_btns",
                label: "Forward/backwards buttons",
                type: "Bool",
              },
              {
                name: "fwd_back_amount",
                label: "Forward/back amount",
                input_type: "select",
                options: [
                  { label: "1x current range", value: 1 },
                  { label: "1/2x current range", value: 0.5 },
                  { label: "1/3x current range", value: 0.333 },
                  { label: "1/4x current range", value: 0.25 },
                ],
                showIf: { fwd_back_btns: true },
              },
              {
                name: "zoom_btns",
                label: "Zoom in/out buttons",
                type: "Bool",
              },
              {
                name: "placeholder",
                label: "Placeholder",
                type: "String",
              },
            ],
          });
        },
      },
      {
        name: "Preset ranges",
        form: async () => {
          return new Form({
            blurb: "Specify the date range presets, if any.",
            fields: [
              new FieldRepeat({
                name: "ranges",
                defaultNone: true,
                label: "Preset ranges",
                fields: [
                  {
                    name: "name",
                    label: "Name",
                    type: "String",
                    required: true,
                  },
                  {
                    name: "from_offset",
                    label: "From offset",
                    type: "Integer",
                    sublabel:
                      "Positive or negative number of days to add or subtract",
                    required: true,
                  },
                  {
                    name: "from_base",
                    label: "on",
                    type: "String",
                    required: true,
                    attributes: {
                      options: [
                        "Today",
                        "StartOfWeek",
                        "EndOfWeek",
                        "StartOfMonth",
                        "EndOfMonth",
                        "StartOfQuarter",
                        "EndOfQuarter",
                        "StartOfYear",
                        "EndOfYear",
                      ],
                    },
                  },
                  {
                    name: "to_offset",
                    label: "To offset",
                    type: "Integer",
                    required: true,
                  },
                  {
                    name: "to_base",
                    label: "on",
                    type: "String",
                    required: true,
                    attributes: {
                      options: [
                        "Today",
                        "StartOfWeek",
                        "EndOfWeek",
                        "StartOfMonth",
                        "EndOfMonth",
                        "StartOfQuarter",
                        "EndOfQuarter",
                        "StartOfYear",
                        "EndOfYear",
                      ],
                    },
                  },
                  {
                    name: "snap_mondays",
                    label: "Snap to Mondays",
                    type: "String",
                    attributes: { options: ["Last before", "First after"] },
                  },
                ],
              }),
            ],
          });
        },
      },
      {
        name: "Default range",
        form: async (ctx) => {
          return new Form({
            fields: [
              ...(ctx?.ranges?.length
                ? [
                    {
                      name: "default_range",
                      label: "Default range",
                      type: "String",
                      attributes: { options: ctx.ranges.map((r) => r.name) },
                    },
                  ]
                : []),
              {
                name: "neutral_label",
                label: "Neutral label",
                type: "String",
                showIf: ctx?.ranges?.length ? { default_range: "" } : undefined,
              },
            ],
          });
        },
      },
    ],
  });
const mkBaseMoment = (base) => {
  if (!base || base === "Today") return "";
  if (base.startsWith("StartOf"))
    return `.startOf('${base.replace("StartOf", "").toLowerCase()}')`;
  if (base.startsWith("EndOf"))
    return `.endOf('${base.replace("EndOf", "").toLowerCase()}')`;
};
const mkOffsetMoment = (n) =>
  !n ? `` : n < 0 ? `.subtract(${-n}, 'days')` : `.add(${n}, 'days')`;

const snapMonday = (snap) => {
  if (snap === "Last before") return ".isoWeekday(1)";
  if (snap === "First after") return ".isoWeekday(8)";
  return "";
};
const mkRange = ({
  name,
  to_base,
  to_offset,
  from_base,
  from_offset,
  snap_mondays,
}) =>
  `'${name}': [moment()${mkBaseMoment(from_base)}${mkOffsetMoment(
    from_offset
  )}${snapMonday(snap_mondays)},
               moment()${mkBaseMoment(to_base)}${mkOffsetMoment(
    to_offset
  )}${snapMonday(snap_mondays)} ]`;

const run = async (
  table_id,
  viewname,
  {
    date_field,
    end_date_field,
    fwd_back_btns,
    zoom_btns,
    ranges,
    default_range,
    neutral_label,
    fwd_back_amount,
    placeholder,
  },
  state,
  extra
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const field = fields.find((f) => f.name === date_field);
  if (!field) return "";
  const name = text_attr(field.name);
  const fwd_back_amount_n = +fwd_back_amount || 0.25;
  const from =
    state[`_fromdate_${name}`] || state[`_fromdate_${end_date_field}`];
  const to = state[`_todate_${name}`];
  const def_range_obj = default_range
    ? ranges.find((r) => r.name === default_range)
    : null;
  const def_from = def_range_obj
    ? `moment()${mkBaseMoment(def_range_obj.from_base)}${mkOffsetMoment(
        def_range_obj.from_offset
      )}${snapMonday(def_range_obj.snap_mondays)}`
    : null;
  const def_to = def_range_obj
    ? `moment()${mkBaseMoment(def_range_obj.to_base)}${mkOffsetMoment(
        def_range_obj.to_offset
      )}${snapMonday(def_range_obj.snap_mondays)}`
    : null;
  const set_initial =
    from && to
      ? `startDate: moment("${from}"), 
         endDate: moment("${to}"),`
      : def_range_obj
      ? `startDate: ${def_from}, 
         endDate: ${def_to},`
      : "";
  const setter = (start, end) =>
    end_date_field
      ? `set_state_fields({
        _fromdate_${end_date_field}: ${start}.toDate().toLocaleDateString('en-CA'), 
        _todate_${name}: ${end}.toDate().toLocaleDateString('en-CA')
        }, true)`
      : `set_state_fields({
    _fromdate_${name}: ${start}.toDate().toLocaleDateString('en-CA'), 
    _todate_${name}: ${end}.toDate().toLocaleDateString('en-CA')
    },true)`;
  const unsetter = end_date_field
    ? `set_state_fields({
        _fromdate_${end_date_field}: {unset: true}, 
        _todate_${name}: {unset: true}
        }, true)`
    : `set_state_fields({
    _fromdate_${name}: {unset: true}, 
    _todate_${name}: {unset: true}
    },true)`;

  return (
    input({
      type: "text",
      class: "form-control d-inline",
      style: { width: "20em" },
      name: `daterangefilter${name}`,
      id: `daterangefilter${name}`,
      autocomplete: "off",
      placeholder,
      value:
        from && to
          ? `${new Date(from).toLocaleDateString("en-GB")} - ${new Date(
              to
            ).toLocaleDateString("en-GB")}`
          : neutral_label,
    }) +
    (fwd_back_btns
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !((from && to) || def_range_obj),
            onClick: `drp_back_fwd(true, ${from ? `'${from}'` : def_from},  ${
              to ? `'${to}'` : def_to
            })`,
          },

          i({ class: "fas fa-angle-left" })
        ) +
        button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !((from && to) || def_range_obj),
            onClick: `drp_back_fwd(false, ${from ? `'${from}'` : def_from},  ${
              to ? `'${to}'` : def_to
            })`,
          },
          i({ class: "fas fa-angle-right" })
        )
      : "") +
    (zoom_btns
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !((from && to) || def_range_obj),
            onClick: `drp_zoom_btn(false, ${from ? `'${from}'` : def_from},  ${
              to ? `'${to}'` : def_to
            })`,
          },

          i({ class: "fas fa-search-minus" })
        ) +
        button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !((from && to) || def_range_obj),
            onClick: `drp_zoom_btn(true,  ${from ? `'${from}'` : def_from},  ${
              to ? `'${to}'` : def_to
            })`,
          },
          i({ class: "fas fa-search-plus" })
        )
      : "") +
    script(
      domReady(
        `$('#daterangefilter${name}').daterangepicker({
        ${
          ranges?.length
            ? `ranges: {
            ${ranges.map(mkRange).join(",\n")}         
          },`
            : ""
        }
        ${!def_range_obj ? `autoUpdateInput: false,` : ""}
        locale: {
          format: 'DD/MM/YYYY',
          ${!ranges?.length ? `cancelLabel: "${extra.req.__("Clear")}"` : ""}
        },
        ${set_initial}
        }, function(start, end) {
          console.log("setter")
          ${setter("start", "end")}
        });
        ${
          !def_range_obj
            ? `$('#daterangefilter${name}').on('apply.daterangepicker', function(ev, picker) {
          console.log("pick")

          $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
        });
    
        $('#daterangefilter${name}').on('cancel.daterangepicker', function(ev, picker) {
          console.log("clear")

          $(this).val('');
          ${unsetter}
        });`
            : ""
        }
        window.drp_back_fwd=(dir_back, start, end)=> {
          let diff = moment.duration(moment(end).diff(start));
          if(dir_back) {
            ${setter(
              `moment(start).subtract(diff*${fwd_back_amount_n})`,
              `moment(end).subtract(diff*${fwd_back_amount_n})`
            )}           
          } else {
            ${setter(
              `moment(start).add(diff*${fwd_back_amount_n})`,
              `moment(end).add(diff*${fwd_back_amount_n})`
            )}           
          }
        }
        window.drp_zoom_btn=(dir_in, start, end)=> {
          let diffDays = moment.duration(moment(end).diff(start)).asDays();
          let newFrom, newTo;
          if(dir_in && diffDays<2) return;
          if(dir_in) {
            newFrom = moment(start).add(Math.ceil(diffDays/4), 'days')
            newTo = moment(end).subtract(Math.ceil(diffDays/4), 'days')            
          } else {
            newFrom = moment(start).subtract(Math.ceil(diffDays/2), 'days')
            newTo = moment(end).add(Math.ceil(diffDays/2), 'days')
          }
          ${setter("newFrom", "newTo")}
        }
        ${def_range_obj && !(from && to) ? setter(def_from, def_to) : ""}`
      )
    )
  );
};
const get_state_fields = () => [];
module.exports = {
  name: "Date Range Picker",
  description:
    "Limit selected rows to those for which a date fields falls in a range selected by the user",
  configuration_workflow,
  run,
  get_state_fields,
  display_state_form: false,
};
