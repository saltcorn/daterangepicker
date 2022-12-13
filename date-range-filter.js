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
        name: "Layout",
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
                name: "zoom_btns",
                label: "Zoom in/out buttons",
                type: "Bool",
              },
            ],
          });
        },
      },
      {
        name: "Preset ranges",
        form: async () => {
          return new Form({
            fields: [
              new FieldRepeat({
                name: "ranges",
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
              {
                name: "default_range",
                label: "Default range",
                type: "String",
                attributes: { options: ctx.ranges.map((r) => r.name) },
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

const mkRange = ({ name, to_base, to_offset, from_base, from_offset }) =>
  `'${name}': [moment()${mkBaseMoment(from_base)}${mkOffsetMoment(from_offset)},
               moment()${mkBaseMoment(to_base)}${mkOffsetMoment(to_offset)} ]`;

const run = async (
  table_id,
  viewname,
  { date_field, fwd_back_btns, zoom_btns, ranges, default_range },
  state,
  extra
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const field = fields.find((f) => f.name === date_field);
  const name = text_attr(field.name);
  const from = state[`_fromdate_${name}`];
  const to = state[`_todate_${name}`];
  const def_range_obj = default_range
    ? ranges.find((r) => r.name === default_range)
    : null;
  const def_from = def_range_obj
    ? `moment()${mkBaseMoment(def_range_obj.from_base)}${mkOffsetMoment(
        def_range_obj.from_offset
      )}`
    : null;
  const def_to = def_range_obj
    ? `moment()${mkBaseMoment(def_range_obj.to_base)}${mkOffsetMoment(
        def_range_obj.to_offset
      )}`
    : null;
  const set_initial =
    from && to
      ? `startDate: moment("${from}"), 
         endDate: moment("${to}"),`
      : def_range_obj
      ? `startDate: ${def_from}, 
         endDate: ${def_to},`
      : "";
  return (
    input({
      type: "text",
      class: "form-control d-inline",
      style: { width: "20em" },
      name: `daterangefilter${name}`,
      id: `daterangefilter${name}`,
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
        ranges: {
            ${ranges.map(mkRange).join(",\n")}         
          },
        locale: {
          format: 'DD/MM/YYYY'
        },
        ${set_initial}
        }, function(start, end) {
          set_state_fields({
            _fromdate_${name}: start.toDate().toLocaleDateString('en-CA'), 
            _todate_${name}: end.toDate().toLocaleDateString('en-CA')
            })
                      
        });
        window.drp_back_fwd=(dir_back, start, end)=> {
          let diff = moment.duration(moment(end).diff(start));
          if(dir_back) {
            set_state_fields({
              _fromdate_${name}: moment(start).subtract(diff/4).toDate().toLocaleDateString('en-CA'), 
              _todate_${name}: moment(end).subtract(diff/4).toDate().toLocaleDateString('en-CA')
              })
          } else {
            set_state_fields({
              _fromdate_${name}: moment(start).add(diff/4).toDate().toLocaleDateString('en-CA'), 
              _todate_${name}:  moment(end).add(diff/4).toDate().toLocaleDateString('en-CA')
              })
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
          set_state_fields({
            _fromdate_${name}: newFrom.toDate().toLocaleDateString('en-CA'), 
            _todate_${name}: newTo.toDate().toLocaleDateString('en-CA')
          })        
        }
        ${
          def_range_obj && !(from && to)
            ? `set_state_fields({
          _fromdate_${name}: ${def_from}.toDate().toLocaleDateString('en-CA'), 
          _todate_${name}: ${def_to}.toDate().toLocaleDateString('en-CA')
        })`
            : ""
        }`
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
