const User = require("@saltcorn/data/models/user");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Workflow = require("@saltcorn/data/models/workflow");
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
    ],
  });
const run = async (
  table_id,
  viewname,
  { date_field, fwd_back_btns, zoom_btns },
  state,
  extra
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const field = fields.find((f) => f.name === date_field);
  const name = text_attr(field.name);
  const from = state[`_fromdate_${name}`];
  const to = state[`_todate_${name}`];
  const set_initial =
    from && to
      ? `startDate: moment("${from}"), 
         endDate: moment("${to}"),`
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
            disabled: !(from && to),
            onClick: `drp_back_fwd(true, '${from}', '${to}')`,
          },

          i({ class: "fas fa-angle-left" })
        ) +
        button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !(from && to),
            onClick: `drp_back_fwd(false, '${from}', '${to}')`,
          },
          i({ class: "fas fa-angle-right" })
        )
      : "") +
    (zoom_btns
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !(from && to),
            onClick: `drp_zoom_btn(false, '${from}', '${to}')`,
          },

          i({ class: "fas fa-search-minus" })
        ) +
        button(
          {
            class: "btn btn-sm btn-primary ms-2",
            disabled: !(from && to),
            onClick: `drp_zoom_btn(true, '${from}', '${to}')`,
          },
          i({ class: "fas fa-search-plus" })
        )
      : "") +
    script(
      domReady(
        `$('#daterangefilter${name}').daterangepicker({
        ranges: {
            'Today': [moment().subtract(1, 'days'), moment()],
            'Yesterday': [moment().subtract(2, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
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
              _fromdate_${name}: moment(start).subtract(diff/2).toDate().toLocaleDateString('en-CA'), 
              _todate_${name}: moment(end).subtract(diff/2).toDate().toLocaleDateString('en-CA')
              })
          } else {
            set_state_fields({
              _fromdate_${name}: moment(start).add(diff/2).toDate().toLocaleDateString('en-CA'), 
              _todate_${name}:  moment(end).add(diff/2).toDate().toLocaleDateString('en-CA')
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
