/* Phase 2, admin side (PRD 18): organization profile, entities, locations, work week,
   holidays, users, roles, billing, AI, integrations, system settings and audit logs. */
(function () {
  var HRMS = window.HRMS;
  var React = window.React, h = React.createElement, V = window.Violet, I = window.Icons;
  var store = HRMS.store, router = HRMS.router, ui = HRMS.ui, seed = HRMS.seed;
  var act = HRMS.actions, perms = HRMS.permissions;
  var Card = ui.Card, Grid = ui.Grid, PageHead = ui.PageHead, Stat = ui.Stat, Stats = ui.Stats;

  function emp(id) { return store.employee(id); }
  function org() { return Object.assign({}, seed.org, (store.find('orgProfile', 'org') || {})); }

  /* ====================================================== Organization profile */
  function CompanyProfile() {
    var o = org();
    var editSt = React.useState(false);
    var form = ui.useForm(o, function (v) {
      return HRMS.rules.required([{ key: 'name', label: 'Organization name' }, { key: 'industry', label: 'Industry' }], v);
    });

    function save() {
      form.submit(function (v) {
        return ui.report(act.updateOrganization({
          name: v.name, industry: v.industry, website: v.website, size: v.size, founded: v.founded
        }));
      });
      editSt[1](false);
    }

    return h(React.Fragment, null,
      h(Grid, null,
        h(Card, { span: 7, title: 'Company profile',
          aside: h(V.Button, { variant: editSt[0] ? 'ghost' : 'outline', className: 'vi-btn--sm', iconStart: I.pencil,
            onClick: function () { form.reset(org()); editSt[1](!editSt[0]); } }, editSt[0] ? 'Cancel' : 'Edit') },
          editSt[0]
            ? h('div', { className: 'stack gap-4' },
                h(ui.FieldRow, null,
                  h(V.TextField, Object.assign({ label: 'Organization name', required: true }, form.field('name'))),
                  h(V.TextField, Object.assign({ label: 'Industry', required: true }, form.field('industry')))),
                h(ui.FieldRow, null,
                  h(V.TextField, Object.assign({ label: 'Website' }, form.field('website'))),
                  h(V.TextField, Object.assign({ label: 'Company size' }, form.field('size')))),
                h('div', { className: 'row gap-2' },
                  h(V.Button, { variant: 'primary', onClick: save }, 'Save changes'),
                  h(V.Button, { variant: 'outline', onClick: function () { editSt[1](false); } }, 'Cancel')))
            : h(ui.KeyValue, { rows: [
                ['Organization name', o.name],
                ['Industry', o.industry],
                ['Company size', o.size],
                ['Website', o.website],
                ['Founded', o.founded],
                ['Registration', seed.entities[0].reg],
                ['Primary entity', seed.entities[0].name]
              ]})),
        h(Card, { span: 5, title: 'At a glance' },
          h(ui.KeyValue, { rows: [
            ['Employees', store.stats().headcount],
            ['Legal entities', seed.entities.length],
            ['Locations', seed.locations.length],
            ['Departments', store.collection('departments').length],
            ['Designations', store.collection('designations').length],
            ['Subscription', seed.subscription.plan]
          ]}),
          h(V.Button, { variant: 'outline', className: 'vi-btn--sm', iconStart: I.sitemap,
            onClick: function () { router.goAs('hr/config/structure'); } }, 'Organization structure'))));
  }

  function OrganizationDetails() {
    var o = org();
    return h(Grid, null,
      h(Card, { span: 6, title: 'Regional settings' },
        h(ui.KeyValue, { rows: [
          ['Time zone', o.timezone],
          ['Default currency', o.currency + ' (₹)'],
          ['Week starts on', o.weekStart],
          ['Date format', 'DD MMM YYYY'],
          ['Number format', 'Indian grouping (1,23,456)']
        ]})),
      h(Card, { span: 6, title: 'Fiscal & statutory' },
        h(ui.KeyValue, { rows: [
          ['Financial year', '1 April – 31 March'],
          ['Statutory jurisdiction', 'India'],
          ['Provident fund', 'Applicable · 12% of basic'],
          ['Professional tax', 'Slab based, by state'],
          ['Gratuity', 'Applicable after 5 years']
        ]}),
        h('p', { className: 'muted', style: { fontSize: 12 } },
          'PRD 4.34: statutory rules are configurable per jurisdiction and are not assumed to be universal.')));
  }

  function LegalEntities() {
    return h(Card, { title: 'Legal entities', description: 'Registered business entities under the organization.' },
      h(ui.DataTable, {
        exportName: 'legal-entities', label: 'Legal entities', rows: seed.entities, pageSize: 10,
        columns: [
          { key: 'name', header: 'Entity', sortable: true,
            cell: function (e) { return h('span', { className: 'row gap-2' }, e.name, e.primary ? h(V.Chip, { size: 'sm', shape: 'tag' }, 'Primary') : null); } },
          { key: 'country', header: 'Country' },
          { key: 'reg', header: 'Registration', cell: function (e) { return h('span', { className: 'mono' }, e.reg); } },
          { key: 'locations', header: 'Locations', numeric: true, align: 'right',
            cell: function (e) { return seed.locations.filter(function (l) { return l.entity === e.id; }).length; } },
          { key: 'status', header: 'Status', cell: function (e) { return h(ui.StatusChip, { status: e.status }); } }
        ]
      }));
  }

  function Locations() {
    var openSt = React.useState(false);
    var form = ui.useForm({ entity: seed.entities[0].id, tz: seed.org.timezone });
    var rows = store.collection('locations');

    function save() {
      var res = form.submit(function (v) { return ui.report(act.createLocation(v)); });
      if (res && res.ok) { openSt[1](false); form.reset({ entity: seed.entities[0].id, tz: seed.org.timezone }); }
    }

    return h(React.Fragment, null,
      h(Card, { title: 'Locations & branches',
        aside: h(V.Button, { variant: 'primary', className: 'vi-btn--sm', iconStart: I.plus, onClick: function () { openSt[1](true); } }, 'Add location') },
        h(ui.DataTable, {
          exportName: 'locations', label: 'Locations', rows: rows, pageSize: 10, search: function (l) { return l.name + ' ' + l.address; },
          searchPlaceholder: 'Search locations',
          columns: [
            { key: 'name', header: 'Location', sortable: true,
              cell: function (l) { return h('span', { className: 'row gap-2' }, l.name, l.hq ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'info' }, 'HQ') : null); } },
            { key: 'address', header: 'Address' },
            { key: 'tz', header: 'Time zone' },
            { key: 'headcount', header: 'Headcount', numeric: true, align: 'right', sortable: true },
            { key: 'actions', header: '', align: 'right',
              cell: function (l) {
                return h(V.Button, { variant: 'ghost', className: 'vi-btn--sm',
                  onClick: function () { router.goAs('hr/people/all'); } }, 'View people');
              } }
          ]
        })),
      openSt[0] ? h(ui.Modal, {
        title: 'Add location', description: 'A branch or office under a legal entity.',
        onClose: function () { openSt[1](false); },
        footer: h(React.Fragment, null,
          h(V.Button, { variant: 'outline', onClick: function () { openSt[1](false); } }, 'Cancel'),
          h(V.Button, { variant: 'primary', onClick: save }, 'Add location'))
      },
        h(V.TextField, Object.assign({ label: 'Location name', required: true, placeholder: 'e.g. Chennai' }, form.field('name'))),
        h(V.TextArea, Object.assign({ label: 'Address', required: true, rows: 3 }, form.field('address'))),
        h(ui.FieldRow, null,
          h(V.Select, Object.assign({ label: 'Legal entity',
            options: seed.entities.map(function (e) { return { value: e.id, label: e.name }; }) }, form.select('entity'))),
          h(V.TextField, Object.assign({ label: 'Time zone' }, form.field('tz'))))) : null);
  }

  function WorkWeek() {
    var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var working = seed.org.workWeek;
    return h(Grid, null,
      h(Card, { span: 7, title: 'Work week', description: 'Organization-wide default. Locations and shifts may override it.' },
        h('div', { className: 'checks' }, DAYS.map(function (d) {
          var on = working.indexOf(d.slice(0, 3)) >= 0;
          return h('div', { className: 'checks__row', key: d },
            h(V.Switch, { defaultChecked: on, 'aria-label': d }),
            h('div', { className: 'checks__main' },
              h('span', { className: 'checks__name' }, d),
              h('span', { className: 'checks__meta' }, on ? 'Working day' : 'Weekly off')));
        }))),
      h(Card, { span: 5, title: 'Default working hours' },
        h(ui.KeyValue, { rows: [
          ['Hours per day', '9 (including 1 hour break)'],
          ['Standard shift', '09:00 – 18:00'],
          ['Grace period', '15 minutes'],
          ['Half day threshold', '4 hours'],
          ['Full day threshold', '8 hours']
        ]}),
        h(V.Button, { variant: 'outline', className: 'vi-btn--sm',
          onClick: function () { router.goAs('hr/shifts/templates'); } }, 'Shift templates')));
  }

  function OrgHolidays() {
    var rows = store.collection('holidays').slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return h(Card, { title: 'Organization holidays', description: 'The global default calendar. Locations inherit it unless overridden.' },
      h(ui.DataTable, {
        exportName: 'holidays', label: 'Holidays', rows: rows.map(function (hd, i) { return Object.assign({ id: hd.date + i }, hd); }),
        pageSize: 15, onExport: true, search: function (hd) { return hd.name; }, searchPlaceholder: 'Search holidays',
        columns: [
          { key: 'date', header: 'Date', sortable: true, cell: function (hd) { return ui.dateLabel(hd.date); } },
          { key: 'day', header: 'Day', cell: function (hd) {
              return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(hd.date + 'T00:00').getDay()];
            } },
          { key: 'name', header: 'Holiday', sortable: true },
          { key: 'type', header: 'Type', cell: function (hd) { return h(V.Chip, { size: 'sm', shape: 'tag', variant: hd.type === 'Optional' ? 'outline' : 'soft', tone: hd.type === 'Optional' ? 'neutral' : 'info' }, hd.type); } },
          { key: 'passed', header: '', align: 'right',
            cell: function (hd) { return hd.date < seed.todayIso ? h('span', { className: 'muted', style: { fontSize: 12 } }, 'Passed') : ''; } }
        ]
      }));
  }

  function OrgSettings() {
    return h(Grid, null,
      h(Card, { span: 6, title: 'Defaults that cascade to HR' },
        h('div', { className: 'checks' },
          [['Employees may update their own profile', true],
            ['Profile changes need HR approval', true],
            ['Managers may approve leave for their team', true],
            ['Employees may see the team leave calendar', true],
            ['Employees may see the full org directory', true],
            ['Salary visible to the employee', true]].map(function (row) {
            return h('div', { className: 'checks__row', key: row[0] },
              h(V.Switch, { defaultChecked: row[1], 'aria-label': row[0] }),
              h('div', { className: 'checks__main' }, h('span', { className: 'checks__name' }, row[0])));
          }))),
      h(Card, { span: 6, title: 'Numbering & identifiers' },
        h(ui.KeyValue, { rows: [
          ['Employee ID format', h('span', { className: 'mono' }, 'NEX####')],
          ['Next employee ID', h('span', { className: 'mono' }, store.nextId('employees', 'NEX'))],
          ['Leave request prefix', h('span', { className: 'mono' }, 'LV')],
          ['Asset prefix', h('span', { className: 'mono' }, 'AST')],
          ['Approval history', 'Retained indefinitely']
        ]})));
  }

  /* ============================================================= Users (2.1) */
  var ROLE_LABEL = { admin: 'Organization Admin', hr: 'HR Administrator', manager: 'Manager', me: 'Employee' };

  function usersScreen(filter, title, description, emptyTitle) {
    return function () {
      var inviteSt = React.useState(false);
      var confirmSt = React.useState(null);
      var form = ui.useForm({ role: 'me' });
      var all = store.collection('users');
      var rows = filter ? all.filter(filter) : all;

      function invite() {
        var res = form.submit(function (v) { return ui.report(act.inviteUser(v)); });
        if (res && res.ok) { inviteSt[1](false); form.reset({ role: 'me' }); }
      }

      var columns = [
        { key: 'employee', header: 'User', sortable: true,
          sortValue: function (u) { var e = emp(u.employee); return e ? e.name : u.email; },
          csv: function (u) { var e = emp(u.employee); return e ? e.name : u.email; },
          cell: function (u) {
            var e = emp(u.employee);
            return e ? h(ui.Person, { employee: e, sub: u.email, onClick: function () { router.goAs('hr/people/all'); } })
              : h('span', null, u.email);
          } },
        { key: 'role', header: 'Role', sortable: true, cell: function (u) { return ROLE_LABEL[u.role] || u.role; } },
        { key: 'status', header: 'Status', cell: function (u) { return h(ui.StatusChip, { status: u.status }); } },
        { key: 'mfa', header: 'MFA', align: 'center', csv: function (u) { return u.mfa ? 'On' : 'Off'; },
          cell: function (u) { return u.mfa ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'success' }, 'On') : h('span', { className: 'muted' }, 'Off'); } },
        { key: 'lastSignIn', header: 'Last sign-in', sortable: true, cell: function (u) { return u.lastSignIn ? ui.relTime(u.lastSignIn) : h('span', { className: 'muted' }, 'Never'); } },
        { key: 'actions', header: '', align: 'right',
          cell: function (u) {
            if (u.status === 'Pending Invitation') {
              return h('span', { className: 'row gap-2', style: { justifyContent: 'flex-end' } },
                h(V.Button, { variant: 'ghost', className: 'vi-btn--sm', onClick: function () { ui.toast('Invitation resent to ' + u.email, 'success'); } }, 'Resend'),
                h(V.Button, { variant: 'outline', className: 'vi-btn--sm', onClick: function () { confirmSt[1]({ user: u, to: 'Deactivated', verb: 'Revoke' }); } }, 'Revoke'));
            }
            return h('span', { className: 'row gap-2', style: { justifyContent: 'flex-end' } },
              u.status === 'Active'
                ? h(V.Button, { variant: 'outline', className: 'vi-btn--sm', onClick: function () { confirmSt[1]({ user: u, to: 'Suspended', verb: 'Suspend' }); } }, 'Suspend')
                : h(V.Button, { variant: 'outline', className: 'vi-btn--sm', onClick: function () { ui.report(act.setUserStatus(u.id, 'Active')); } }, 'Reactivate'));
          } }
      ];

      return h(React.Fragment, null,
        h(Card, {
          title: title, description: description,
          aside: h(V.Button, { variant: 'primary', className: 'vi-btn--sm', iconStart: I.plus, onClick: function () { inviteSt[1](true); } }, 'Invite user')
        },
          h(ui.DataTable, {
            exportName: 'users', label: 'Users', rows: rows, pageSize: 10,
            search: function (u) { var e = emp(u.employee); return (e ? e.name : '') + ' ' + u.email + ' ' + u.role; },
            searchPlaceholder: 'Search by name, email or role',
            emptyIcon: I.users, emptyTitle: emptyTitle || 'No users here',
            emptyBody: 'Users appear here once they match this view.'
          })),

        inviteSt[0] ? h(ui.Modal, {
          title: 'Invite user', description: 'The invitee sets their own password from the emailed link.',
          onClose: function () { inviteSt[1](false); },
          footer: h(React.Fragment, null,
            h(V.Button, { variant: 'outline', onClick: function () { inviteSt[1](false); } }, 'Cancel'),
            h(V.Button, { variant: 'primary', onClick: invite }, 'Send invitation'))
        },
          h(V.TextField, Object.assign({ label: 'Work email', type: 'email', required: true, placeholder: 'name@nexoratech.com' }, form.field('email'))),
          h(V.Select, Object.assign({ label: 'Role', required: true,
            options: Object.keys(ROLE_LABEL).map(function (k) { return { value: k, label: ROLE_LABEL[k] }; }) }, form.select('role'))),
          h(ui.EmployeePicker, {
            label: 'Link to employee record (optional)', allowNone: true,
            value: form.values.employee, onChange: function (v) { form.set('employee', v); }
          })) : null,

        confirmSt[0] ? h(ui.Confirm, {
          title: confirmSt[0].verb + ' ' + confirmSt[0].user.email + '?',
          body: confirmSt[0].to === 'Suspended'
            ? 'They will be signed out and blocked from signing in until reactivated.'
            : 'The invitation link stops working immediately.',
          confirmLabel: confirmSt[0].verb, tone: 'danger',
          onClose: function () { confirmSt[1](null); },
          onConfirm: function () { ui.report(act.setUserStatus(confirmSt[0].user.id, confirmSt[0].to)); }
        }) : null);
    };
  }

  /* ================================================ Roles: custom + groups */
  /* The roles this organization has added. They live in the same `roles` collection the
     permission editor writes, so the two screens cannot disagree; creating and
     re-permissioning both happen there, and this tab lists what exists and leads to it. */
  function CustomRoles() {
    var rows = store.collection('roles').filter(function (r) { return !r.system; });

    function openEditor() { router.go('admin/roles/modules'); }

    return h(React.Fragment, null,
      h(Card, {
        title: 'Custom roles', description: 'Roles the organization defines on top of the predefined four.',
        aside: h(V.Button, { variant: 'primary', className: 'vi-btn--sm', iconStart: I.plus, onClick: openEditor }, 'Create role')
      },
        h(ui.DataTable, {
          exportName: 'custom-roles', label: 'Custom roles', rows: rows, pageSize: 10, onExport: false,
          columns: [
            { key: 'name', header: 'Role', sortable: true, cell: function (r) { return h('strong', null, r.name); } },
            { key: 'basedOn', header: 'Falls back to', cell: function (r) {
                var base = store.find('roles', r.basedOn);
                return base ? base.name : (ROLE_LABEL[r.basedOn] || r.basedOn);
              } },
            { key: 'description', header: 'Description' },
            { key: 'perms', header: 'Changed', numeric: true, align: 'right',
              csv: function (r) { return Object.keys(r.perms || {}).length; },
              cell: function (r) {
                var n = Object.keys(r.perms || {}).length;
                return n ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'info' }, n + (n === 1 ? ' module' : ' modules'))
                  : h('span', { className: 'muted' }, 'Same as its fallback');
              } },
            { key: 'users', header: 'Users', numeric: true, align: 'right' },
            { key: 'actions', header: '', align: 'right', cell: function () {
                return h(V.Button, { variant: 'ghost', className: 'vi-btn--sm', iconEnd: I.right, onClick: openEditor }, 'Permissions');
              } }
          ],
          emptyIcon: I.shield, emptyTitle: 'No custom roles yet',
          emptyBody: 'The four predefined roles cover most needs. Create a custom role to vary module access.',
          emptyActions: h(V.Button, { variant: 'primary', iconStart: I.plus, onClick: openEditor }, 'Create role')
        })),
      null);
  }

  function PermissionGroups() {
    var GROUPS = [
      { id: 'pg-1', name: 'People operations', modules: ['people', 'onboarding', 'offboarding'], roles: 'HR Administrator' },
      { id: 'pg-2', name: 'Time & attendance', modules: ['leave', 'attendance', 'shifts'], roles: 'HR Administrator, Manager' },
      { id: 'pg-3', name: 'Compensation', modules: ['payroll'], roles: 'HR Administrator' },
      { id: 'pg-4', name: 'Platform governance', modules: ['org', 'users', 'roles', 'billing', 'settings', 'audit'], roles: 'Organization Admin' },
      { id: 'pg-5', name: 'Self-service', modules: ['people', 'leave', 'attendance', 'documents', 'assets'], roles: 'Employee' }
    ];
    return h(Card, { title: 'Permission groups', description: 'Reusable bundles of module permissions that roles draw from.' },
      h(ui.DataTable, {
        exportName: 'permission-groups', label: 'Permission groups', rows: GROUPS, pageSize: 10, onExport: false,
        columns: [
          { key: 'name', header: 'Group', sortable: true },
          { key: 'modules', header: 'Modules', csv: function (g) { return g.modules.join('; '); },
            cell: function (g) {
              return h('span', { className: 'row gap-2 wrap' }, g.modules.map(function (m) {
                return h(V.Chip, { key: m, size: 'sm', shape: 'tag' }, (perms.byModule[m] || {}).label || m);
              }));
            } },
          { key: 'roles', header: 'Used by' }
        ]
      }));
  }

  function ApprovalPermissions() {
    var KINDS = [
      ['Leave Request', 'Reporting Manager', 'HR Administrator', 'Sequential'],
      ['Attendance Regularization', 'Reporting Manager', 'HR Administrator', 'Sequential'],
      ['Shift Swap', 'Reporting Manager', '—', 'Single'],
      ['Asset Request', 'IT Administrator', 'HR Administrator', 'Sequential'],
      ['Profile Change', 'HR Administrator', '—', 'Single'],
      ['Payroll', 'Finance Controller', 'Organization Admin', 'Sequential'],
      ['Document Verification', 'HR Administrator', '—', 'Single'],
      ['Resignation', 'Reporting Manager', 'HR Administrator', 'Sequential'],
      ['Performance Review', 'Reporting Manager', 'Department Head', 'Sequential']
    ].map(function (k, i) { return { id: i, kind: k[0], first: k[1], second: k[2], mode: k[3] }; });

    return h(Card, { title: 'Approval permissions', description: 'Which roles may approve which request types (PRD 6.3).' },
      h(ui.DataTable, {
        exportName: 'approval-permissions', label: 'Approval permissions', rows: KINDS, pageSize: 15, onExport: false,
        columns: [
          { key: 'kind', header: 'Request type', sortable: true },
          { key: 'first', header: 'First approver' },
          { key: 'second', header: 'Second approver' },
          { key: 'mode', header: 'Mode', cell: function (r) { return h(V.Chip, { size: 'sm', shape: 'tag' }, r.mode); } }
        ]
      }));
  }

  /* ================================================== Billing & subscription */
  function CurrentPlan() {
    var sub = seed.subscription, s = store.stats();
    return h(Grid, null,
      h(Card, { span: 5, title: 'Current plan' },
        h('div', { className: 'stack gap-2' },
          h('span', { style: { font: '300 30px/1.1 var(--font-flex)' } }, sub.plan),
          h(ui.StatusChip, { status: sub.status })),
        h(ui.KeyValue, { rows: [
          ['Billing cycle', sub.cycle],
          ['Seats', sub.seatsUsed + ' of ' + sub.seats],
          ['Renews on', sub.renewsLabel],
          ['Annual value', ui.inr(sub.amount)]
        ]}),
        h(V.Button, { variant: 'primary', onClick: function () { router.go('admin/billing/change'); } }, 'Change plan')),
      h(Card, { span: 7, title: 'What the plan includes' },
        h('ul', { className: 'bullets' },
          (seed.plans.filter(function (p) { return p.current; })[0] || seed.plans[1]).features.map(function (f) {
            return h('li', { key: f }, f);
          })),
        h(V.ProgressBar, { label: 'Seat utilisation', value: ui.pct(sub.seatsUsed, sub.seats), showValue: true, tone: 'info' }),
        h('p', { className: 'muted', style: { fontSize: 12 } },
          s.headcount + ' live employee records consume ' + sub.seatsUsed + ' seats. Invited employees count towards the limit.')));
  }

  function SeatLimits() {
    var sub = seed.subscription;
    var byStatus = {};
    store.collection('employees').filter(function (e) { return e.status !== 'Exited'; })
      .forEach(function (e) { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });
    return h(Grid, null,
      h(Card, { span: 7, title: 'Seat consumption by employee status' },
        h(ui.Bars, { rows: Object.keys(byStatus).map(function (k) { return [k, byStatus[k]]; }).sort(function (a, b) { return b[1] - a[1]; }) })),
      h(Card, { span: 5, title: 'Limits' },
        h(ui.KeyValue, { rows: [
          ['Seats purchased', sub.seats],
          ['Seats used', sub.seatsUsed],
          ['Seats free', sub.seats - sub.seatsUsed],
          ['Utilisation', ui.pct(sub.seatsUsed, sub.seats) + '%'],
          ['Overage policy', 'Blocked — new records refused past the limit']
        ]}),
        sub.seats - sub.seatsUsed < 20
          ? h('div', { className: 'ai-note' },
              h('span', { className: 'ai-note__mark' }, I.warn),
              h('div', { className: 'ai-note__body' },
                h('p', { className: 'ai-note__text' }, 'Fewer than 20 seats remain. Hiring plans above that will need an upgrade.')))
          : null));
  }

  function BillingHistory() {
    return h(Card, { title: 'Billing history' },
      h(ui.DataTable, {
        exportName: 'billing-history', label: 'Billing history', rows: seed.invoices, pageSize: 10,
        columns: [
          { key: 'id', header: 'Invoice', cell: function (x) { return h('span', { className: 'mono' }, x.id); } },
          { key: 'date', header: 'Issued', sortable: true, cell: function (x) { return ui.dateLabel(x.date); } },
          { key: 'period', header: 'Period' },
          { key: 'amount', header: 'Amount', numeric: true, align: 'right', cell: function (x) { return ui.inr(x.amount); } },
          { key: 'tax', header: 'GST', numeric: true, align: 'right', cell: function (x) { return ui.inr(x.tax); } },
          { key: 'total', header: 'Total', numeric: true, align: 'right', csv: function (x) { return x.amount + x.tax; },
            cell: function (x) { return h('strong', { style: { fontWeight: 500 } }, ui.inr(x.amount + x.tax)); } },
          { key: 'status', header: 'Status', cell: function (x) { return h(ui.StatusChip, { status: x.status }); } }
        ]
      }));
  }

  function Invoices() {
    var openSt = React.useState(null);
    return h(React.Fragment, null,
      h(Card, { title: 'Invoices', description: 'Downloadable invoices with line items and tax.' },
        h(ui.DataTable, {
          exportName: 'invoices', label: 'Invoices', rows: seed.invoices, pageSize: 10,
          columns: [
            { key: 'id', header: 'Invoice', cell: function (x) { return h('span', { className: 'mono' }, x.id); } },
            { key: 'date', header: 'Issued', cell: function (x) { return ui.dateLabel(x.date); } },
            { key: 'period', header: 'Period' },
            { key: 'total', header: 'Total', numeric: true, align: 'right', csv: function (x) { return x.amount + x.tax; },
              cell: function (x) { return ui.inr(x.amount + x.tax); } },
            { key: 'actions', header: '', align: 'right',
              cell: function (x) { return h(V.Button, { variant: 'outline', className: 'vi-btn--sm', onClick: function () { openSt[1](x); } }, 'View'); } }
          ]
        })),
      openSt[0] ? h(ui.Modal, {
        title: openSt[0].id, description: openSt[0].period, onClose: function () { openSt[1](null); },
        footer: h(V.Button, { variant: 'primary', iconStart: I.download, onClick: function () { ui.toast('Invoice download started', 'success'); } }, 'Download PDF')
      },
        h(ui.KeyValue, { rows: [
          ['Billed to', seed.entities[0].name],
          ['Registration', seed.entities[0].reg],
          ['Plan', seed.subscription.plan + ' · ' + seed.subscription.seats + ' seats'],
          ['Subtotal', ui.inr(openSt[0].amount)],
          ['GST (18%)', ui.inr(openSt[0].tax)],
          ['Total', h('strong', null, ui.inr(openSt[0].amount + openSt[0].tax))],
          ['Status', h(ui.StatusChip, { status: openSt[0].status })]
        ]})) : null);
  }

  function PaymentMethods() {
    return h(Card, { title: 'Payment methods',
      aside: h(V.Button, { variant: 'outline', className: 'vi-btn--sm', iconStart: I.plus, onClick: function () { ui.toast('Adding a payment method is out of scope for the prototype', 'info'); } }, 'Add method') },
      h('div', { className: 'list' }, seed.paymentMethods.map(function (m) {
        return h('div', { className: 'list__row', key: m.id },
          h('span', { className: 'empty__mark', style: { width: 34, height: 34 } }, I.card),
          h('div', { className: 'list__main' },
            h('span', { className: 'list__title' }, m.detail),
            h('span', { className: 'list__meta' }, m.kind + (m.expiry ? ' · expires ' + m.expiry : ''))),
          m.primary ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'success' }, 'Primary') : null);
      })));
  }

  function ChangePlan() {
    var sub = seed.subscription;
    return h(React.Fragment, null,
      h(Grid, null, seed.plans.map(function (p) {
        return h(Card, { key: p.id, span: 4, title: p.name,
          aside: p.current ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'success' }, 'Current') : null },
          h('span', { style: { font: '300 26px/1.1 var(--font-flex)' } }, ui.inr(p.price, { short: true })),
          h('span', { className: 'muted', style: { fontSize: 12 } }, 'per year · ' + p.seats + ' seats'),
          h('ul', { className: 'bullets' }, p.features.map(function (f) { return h('li', { key: f }, f); })),
          p.current
            ? h(V.Button, { variant: 'outline', disabled: true }, 'Current plan')
            : h(V.Button, { variant: 'primary',
                onClick: function () { ui.toast((p.price > sub.amount ? 'Upgrade' : 'Downgrade') + ' to ' + p.name + ' would be prorated from today', 'info'); } },
                p.price > sub.amount ? 'Upgrade' : 'Downgrade'));
      })),
      h(Card, { title: 'Before you change' },
        h('p', { className: 'muted', style: { fontSize: 13, lineHeight: 1.6 } },
          'A downgrade below ' + sub.seatsUsed + ' seats is refused while that many employee records are live. ' +
          'Changes are prorated against the remaining term and appear on the next invoice.')));
  }

  /* ================================================================ AI (2.1) */
  function AiDashboard() {
    var ai = seed.aiUsage;
    var used = ui.pct(ai.used, ai.credits);
    return h(React.Fragment, null,
      h(Stats, null,
        h(Stat, { label: 'Credits included', value: (ai.credits / 1000) + 'k', sub: 'Per billing year' }),
        h(Stat, { label: 'Credits consumed', value: (ai.used / 1000).toFixed(1) + 'k', sub: used + '% of the allowance', tone: used > 80 ? 'warn' : 'good' }),
        h(Stat, { label: 'Credits remaining', value: ((ai.credits - ai.used) / 1000).toFixed(1) + 'k', sub: 'Resets 1 Apr 2027' }),
        h(Stat, { label: 'Features enabled', value: seed.aiFeatures.filter(function (f) { return f.enabled; }).length, sub: 'of ' + seed.aiFeatures.length + ' available' })),
      h(Grid, null,
        h(Card, { span: 7, title: 'Consumption by module' },
          h(ui.Bars, { rows: ai.byModule.map(function (m) { return [m.module, m.credits]; }) })),
        h(Card, { span: 5, title: 'Allowance' },
          h(V.ProgressBar, { label: 'Credits consumed', value: used, showValue: true, tone: used > 80 ? 'warning' : 'primary' }),
          h(ui.KeyValue, { rows: [
            ['Top module', ai.byModule[0].module],
            ['Average per employee', Math.round(ai.used / store.stats().headcount) + ' credits'],
            ['Projected year end', Math.round(ai.used * 1.7).toLocaleString() + ' credits']
          ]}),
          h(V.Button, { variant: 'outline', className: 'vi-btn--sm', onClick: function () { router.go('admin/ai/limits'); } }, 'Set usage limits'))));
  }

  function AiCredits() {
    var ai = seed.aiUsage;
    var TOPUPS = [
      { id: 't1', on: '2026-04-01', credits: 50000, note: 'Included with the Enterprise plan', amount: 0 },
      { id: 't2', on: '2026-09-14', credits: 10000, note: 'Top-up purchase', amount: 60000 }
    ];
    return h(Grid, null,
      h(Card, { span: 5, title: 'Balance' },
        h('span', { style: { font: '300 34px/1.1 var(--font-flex)' } }, (ai.credits - ai.used).toLocaleString()),
        h('span', { className: 'muted', style: { fontSize: 13 } }, 'credits remaining of ' + ai.credits.toLocaleString()),
        h(V.ProgressBar, { value: ui.pct(ai.used, ai.credits), showValue: true }),
        h(V.Button, { variant: 'primary', className: 'vi-btn--sm', onClick: function () { ui.toast('Credit top-up is out of scope for the prototype', 'info'); } }, 'Buy credits')),
      h(Card, { span: 7, title: 'Credit history' },
        h(ui.DataTable, {
          exportName: 'ai-credits', label: 'Credit history', rows: TOPUPS, pageSize: 10, onExport: false,
          columns: [
            { key: 'on', header: 'Date', cell: function (x) { return ui.dateLabel(x.on); } },
            { key: 'credits', header: 'Credits', numeric: true, align: 'right', cell: function (x) { return '+' + x.credits.toLocaleString(); } },
            { key: 'note', header: 'Source' },
            { key: 'amount', header: 'Cost', numeric: true, align: 'right', cell: function (x) { return x.amount ? ui.inr(x.amount) : h('span', { className: 'muted' }, 'Included'); } }
          ]
        })));
  }

  function AiByModule() {
    var ai = seed.aiUsage;
    var total = ai.byModule.reduce(function (n, m) { return n + m.credits; }, 0);
    return h(Card, { title: 'Consumption by module' },
      h(ui.DataTable, {
        exportName: 'ai-by-module', label: 'AI usage by module',
        rows: ai.byModule.map(function (m, i) { return Object.assign({ id: i }, m); }), pageSize: 10,
        columns: [
          { key: 'module', header: 'Module', sortable: true },
          { key: 'credits', header: 'Credits', numeric: true, align: 'right', sortable: true, cell: function (m) { return m.credits.toLocaleString(); } },
          { key: 'share', header: 'Share', numeric: true, align: 'right', csv: function (m) { return ui.pct(m.credits, total) + '%'; },
            cell: function (m) { return ui.pct(m.credits, total) + '%'; } },
          { key: 'bar', header: '', cell: function (m) { return h(V.ProgressBar, { value: ui.pct(m.credits, total), size: 'sm', 'aria-label': m.module }); } }
        ]
      }));
  }

  function AiByUser() {
    return h(Card, { title: 'Consumption by user', description: 'The heaviest users this billing year.' },
      h(ui.DataTable, {
        exportName: 'ai-by-user', label: 'AI usage by user',
        rows: seed.aiByUser.map(function (x, i) { return Object.assign({ id: i }, x); }), pageSize: 10,
        search: function (x) { return emp(x.employee).name; }, searchPlaceholder: 'Search by name',
        columns: [
          { key: 'employee', header: 'User', csv: function (x) { return emp(x.employee).name; },
            cell: function (x) { return h(ui.Person, { employee: emp(x.employee) }); } },
          { key: 'department', header: 'Department', csv: function (x) { return store.department(emp(x.employee).department).name; },
            cell: function (x) { return store.department(emp(x.employee).department).name; } },
          { key: 'credits', header: 'Credits', numeric: true, align: 'right', sortable: true, cell: function (x) { return x.credits.toLocaleString(); } }
        ]
      }));
  }

  function AiFeatures() {
    return h(Card, { title: 'AI feature configuration', description: 'Turn individual features on or off per module.' },
      h('div', { className: 'checks' }, seed.aiFeatures.map(function (f) {
        return h('div', { className: 'checks__row', key: f.id },
          h(V.Switch, { defaultChecked: f.enabled, 'aria-label': f.name,
            onChange: function (e) { ui.toast(f.name + ' ' + (e.target.checked ? 'enabled' : 'disabled'), 'success'); } }),
          h('div', { className: 'checks__main' },
            h('span', { className: 'checks__name' }, f.name),
            h('span', { className: 'checks__meta' }, f.module + ' · about ' + f.perUse + ' credits per use')),
          h(ui.StatusChip, { status: f.enabled ? 'Active' : 'Not Configured' }));
      })));
  }

  function AiLimits() {
    return h(Grid, null,
      h(Card, { span: 6, title: 'Usage limits' },
        h(V.NumberField, { label: 'Credits per user per month', defaultValue: 400, min: 0, step: 50 }),
        h(V.NumberField, { label: 'Credits per module per month', defaultValue: 4000, min: 0, step: 100 }),
        h(V.NumberField, { label: 'Warn at this percentage of the allowance', defaultValue: 80, min: 50, max: 100, step: 5 }),
        h(V.Switch, { label: 'Block further use once the allowance is exhausted', defaultChecked: true }),
        h(V.Button, { variant: 'primary', onClick: function () { ui.toast('Usage limits saved', 'success'); } }, 'Save limits')),
      h(Card, { span: 6, title: 'What happens at the limit' },
        h('p', { className: 'muted', style: { fontSize: 13, lineHeight: 1.6 } },
          'When a user reaches their monthly cap, AI features stop offering suggestions for that user until the next month. ' +
          'Nothing else in the product is affected, and no work is lost.'),
        h(ui.KeyValue, { rows: [
          ['Users over 80% this month', '0'],
          ['Modules over 80% this month', '0'],
          ['Blocked requests this month', '0']
        ]})));
  }

  /* ========================================================= Integrations

     One page, grouped into sections, replacing the six tabs this module used to carry.
     The tabs split the providers by subject — email, calendar, SSO, third-party, API,
     webhooks — which meant that "what is connected, and is any of it broken" took six
     clicks and was never answerable in one look. Sections put the same grouping on a
     single page, so the whole picture reads at once and a section is a heading rather
     than a destination.

     The cards are the design system's integration card (.icards/.icard), so this module
     looks like the rest of the admin console rather than a list of rows.

     A card opens its own configuration form. The fields come from the seed record, so
     adding a provider is a data change and this screen does not grow a branch for it. */

  function lastSyncLabel(x) {
    if (!x.lastSync) return null;
    return 'Last sync ' + ui.relTime(x.lastSync);
  }

  /* The configuration form a card opens. Fields are declared in the seed record. */
  function IntegrationForm(p) {
    var x = p.integration;
    var init = {};
    x.fields.forEach(function (f) { init[f.id] = f.value; });
    var valSt = React.useState(init);

    function set(id, v) {
      var next = {};
      Object.keys(valSt[0]).forEach(function (k) { next[k] = valSt[0][k]; });
      next[id] = v;
      valSt[1](next);
    }

    function save() {
      store.log('updated the ' + x.name + ' integration', 'Configuration');
      ui.toast(x.name + ' settings saved', 'success');
      p.onClose();
    }

    return h(ui.Modal, {
      title: x.name + ' settings',
      onClose: p.onClose,
      footer: h(React.Fragment, null,
        h(V.Button, { variant: 'outline', onClick: p.onClose }, 'Cancel'),
        h(V.Button, { variant: 'primary', iconStart: I.check, onClick: save }, 'Save settings'))
    },
      h('p', { className: 'muted', style: { fontSize: 13, lineHeight: 1.55, marginTop: 0 } }, x.summary),
      x.fields.map(function (f) {
        var v = valSt[0][f.id];
        if (f.kind === 'switch') {
          return h('div', { className: 'checks__row', key: f.id },
            h(V.Switch, {
              checked: !!v, 'aria-label': f.label,
              onChange: function (e) { set(f.id, e.target.checked); }
            }),
            h('div', { className: 'checks__main' },
              h('span', { className: 'checks__name' }, f.label),
              f.hint ? h('span', { className: 'checks__meta' }, f.hint) : null));
        }
        if (f.kind === 'select') {
          return h(V.Select, {
            key: f.id, label: f.label, value: v, options: f.options, hint: f.hint,
            onChange: function (nv) { set(f.id, nv); }
          });
        }
        return h(V.TextField, {
          key: f.id, label: f.label, value: v, hint: f.hint,
          onChange: function (e) { set(f.id, e.target.value); }
        });
      }));
  }

  /* One provider, as the design system's integration card. */
  function IntegrationCard(p) {
    var x = p.integration;
    var connected = x.status === 'Connected';
    var sync = lastSyncLabel(x);

    return h('div', { className: 'icard' },
      h('div', { className: 'icard__h' },
        h('span', {
          className: 'icard__logo',
          style: { background: x.logo.bg, color: x.logo.fg }
        }, x.logo.text),
        h('span', { style: { minWidth: 0 } },
          h('strong', null, x.name),
          h('span', null, x.detail)),
        h('span', { style: { marginLeft: 'auto', flex: 'none' } },
          h(ui.StatusChip, { status: x.status }))),

      h('p', null, x.summary),

      h('div', { className: 'row gap-2 wrap' }, x.capabilities.map(function (c) {
        return h(V.Chip, { key: c, size: 'sm', shape: 'tag' }, c);
      })),

      /* The sync line sits on its own row rather than in the footer: squeezed in beside
         two buttons on a 290px card it wrapped one word per line. */
      sync ? h('span', { className: 'muted', style: { fontSize: 12 } }, sync) : null,

      h('div', { className: 'icard__f' },
        h(V.Button, {
          variant: connected ? 'outline' : 'primary', className: 'vi-btn--sm',
          iconStart: connected ? I.sliders : I.plug,
          onClick: function () { p.onConfigure(x); }
        }, connected ? 'Configure' : 'Connect'),
        connected ? h(V.Button, {
          variant: 'ghost', className: 'vi-btn--sm',
          onClick: function () {
            store.log('ran a test for the ' + x.name + ' integration', 'Configuration');
            ui.toast(x.name + ' test connection succeeded', 'success');
          }
        }, 'Test connection') : null));
  }

  function Integrations() {
    var cfgSt = React.useState(null);
    var rows = store.collection('integrations');

    /* Sections come from the data and keep its order, so a new provider in a new
       section appears without this screen being told about it. */
    var sections = [];
    rows.forEach(function (x) {
      var at = null;
      sections.forEach(function (s) { if (s.name === x.section) at = s; });
      if (!at) { at = { name: x.section, items: [] }; sections.push(at); }
      at.items.push(x);
    });

    var connected = rows.filter(function (x) { return x.status === 'Connected'; }).length;

    return h(React.Fragment, null,
      h(PageHead, {
        eyebrow: 'Integrations', title: 'Connected services',
        description: connected + ' of ' + rows.length + ' connected. Each card opens its own settings.'
      }),

      sections.map(function (s) {
        return h(ui.FormSection, { key: s.name, title: s.name },
          h('div', { className: 'icards' }, s.items.map(function (x) {
            return h(IntegrationCard, {
              key: x.id, integration: x,
              onConfigure: function (it) { cfgSt[1](it); }
            });
          })));
      }),

      rows.length ? null : h(ui.Empty, { icon: I.plug, title: 'No integrations available yet' }),

      cfgSt[0] ? h(IntegrationForm, {
        integration: cfgSt[0],
        onClose: function () { cfgSt[1](null); }
      }) : null);
  }

  /* ====================================================== System settings */
  function settingsScreen(title, description, rows, toggles) {
    return function () {
      return h(Grid, null,
        h(Card, { span: toggles ? 7 : 12, title: title, description: description },
          h(ui.KeyValue, { rows: rows })),
        toggles ? h(Card, { span: 5, title: 'Options' },
          h('div', { className: 'checks' }, toggles.map(function (t) {
            return h('div', { className: 'checks__row', key: t[0] },
              h(V.Switch, { defaultChecked: t[1], 'aria-label': t[0],
                onChange: function (e) { ui.toast(t[0] + ' ' + (e.target.checked ? 'enabled' : 'disabled'), 'success'); } }),
              h('div', { className: 'checks__main' }, h('span', { className: 'checks__name' }, t[0])));
          }))) : null);
    };
  }

  /* =========================================================== Audit logs */
  function auditScreen(category, title, description) {
    return function () {
      var rows = store.collection('audit').filter(function (a) { return !category || a.category === category; });
      return h(Card, { title: title, description: description },
        h(ui.DataTable, {
          exportName: 'audit-' + (category || 'all').toLowerCase().replace(/ /g, '-'),
          label: title, rows: rows, pageSize: 15,
          search: function (a) { return (emp(a.actor) ? emp(a.actor).name : '') + ' ' + a.action; },
          searchPlaceholder: 'Search by person or action',
          columns: [
            { key: 'on', header: 'When', sortable: true, cell: function (a) { return ui.relTime(a.on); }, csv: function (a) { return a.on; } },
            { key: 'actor', header: 'Who', csv: function (a) { return emp(a.actor) ? emp(a.actor).name : 'System'; },
              cell: function (a) { return emp(a.actor) ? h(ui.Person, { employee: emp(a.actor) }) : h('span', { className: 'muted' }, 'System'); } },
            { key: 'action', header: 'Action' },
            { key: 'category', header: 'Category', cell: function (a) { return h(V.Chip, { size: 'sm', shape: 'tag' }, a.category); } },
            { key: 'local', header: '', align: 'right',
              cell: function (a) { return a.local ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft', tone: 'info' }, 'This session') : ''; } }
          ],
          emptyIcon: I.history, emptyTitle: 'Nothing logged here yet',
          emptyBody: 'Actions you take in this prototype are appended to the log.'
        }));
    };
  }

  function AuditExport() {
    return h(Grid, null,
      h(Card, { span: 7, title: 'Export logs' },
        h(ui.FieldRow, null,
          h(V.DateField, { label: 'From', defaultValue: '2026-10-01' }),
          h(V.DateField, { label: 'To', defaultValue: seed.todayIso })),
        h(V.Select, { label: 'Category', placeholder: 'All categories',
          options: ['User activity', 'Configuration', 'Permissions', 'Security'] }),
        h(V.Button, { variant: 'primary', iconStart: I.download,
          onClick: function () { ui.toast(store.collection('audit').length + ' log entries exported', 'success'); } }, 'Export CSV')),
      h(Card, { span: 5, title: 'Retention' },
        h(ui.KeyValue, { rows: [
          ['Entries retained', store.collection('audit').length],
          ['Retention period', '7 years'],
          ['Oldest entry', ui.dateLabel('2026-10-18')],
          ['Export format', 'CSV, UTF-8']
        ]})));
  }


  /* ============================================ Organization setup (PRD 3.2)
     The four setup screens the admin workspace was missing: the position hierarchy,
     the department list, the teams under them, and employee numbering. Positions are
     deliberately not people — a vacant position keeps its place in the hierarchy, and
     therefore in the approval path, which is the whole reason to model it separately. */

  /* Who actually holds each designation, so a vacancy is counted rather than asserted. */
  function heldBy(desId) {
    return store.collection('employees').filter(function (e) {
      return e.designationId === desId && e.status !== 'Exited';
    });
  }

  function OrgChart() {
    var all = store.collection('designations');
    var roots = all.filter(function (d) { return !d.reportsTo; });
    var vacant = all.filter(function (d) { return !heldBy(d.id).length; });

    function rows(parent, depth, out) {
      all.filter(function (d) { return d.reportsTo === parent; })
        .sort(function (a, b) { return b.level - a.level; })
        .forEach(function (d) { out.push({ d: d, depth: depth }); rows(d.id, depth + 1, out); });
      return out;
    }
    var flat = [];
    roots.forEach(function (r) { flat.push({ d: r, depth: 0 }); rows(r.id, 1, flat); });

    return h(React.Fragment, null,
      h(Stats, null,
        h(Stat, { label: 'Positions', value: all.length, sub: 'across ' + (Math.max.apply(null, all.map(function (d) { return d.level; }))) + ' job levels' }),
        h(Stat, { label: 'Filled', value: all.length - vacant.length, sub: 'held by at least one person', tone: 'good' }),
        h(Stat, { label: 'Vacant', value: vacant.length, sub: vacant.length ? vacant.map(function (d) { return d.name; }).join(', ') : 'Every position is held',
          tone: vacant.length ? 'warn' : 'good' })),

      h(Card, { title: 'Position hierarchy',
        description: 'Positions, not people. A vacant position keeps its place, so the approval path above it still resolves.' },
        h('div', { className: 'tree2' }, flat.map(function (row) {
          var held = heldBy(row.d.id);
          var lead = held[0];
          return h('div', { className: 'tree2__row', key: row.d.id, style: { paddingLeft: (row.depth * 34) + 'px' } },
            row.depth ? h('span', { className: 'tree2__rail' }) : null,
            h('div', { className: 'node2' + (held.length ? '' : ' node2--vacant') },
              held.length
                ? h(V.Avatar, { name: lead.name, size: 'sm' })
                : h('span', { style: { color: 'var(--warning-fg)', display: 'flex' } }, I.person),
              h('span', { className: 'node2__t' },
                h('strong', null, row.d.name),
                h('span', null, row.d.code + ' · level ' + row.d.level + ' · '
                  + (held.length ? held.length + ' holding' : 'Vacant'))),
              held.length > 1 ? h(V.Chip, { size: 'sm', shape: 'tag', variant: 'soft' }, held.length) : null));
        }))));
  }

  function Departments() {
    var rows = store.collection('departments');
    var over = rows.filter(function (d) { return d.headcount > d.target; });
    return h(React.Fragment, null,
      h(Stats, null,
        h(Stat, { label: 'Departments', value: rows.length }),
        h(Stat, { label: 'Headcount', value: rows.reduce(function (n, d) { return n + d.headcount; }, 0),
          sub: 'against a target of ' + rows.reduce(function (n, d) { return n + d.target; }, 0) }),
        h(Stat, { label: 'Over target', value: over.length,
          sub: over.length ? over.map(function (d) { return d.name; }).join(', ') : 'All within target',
          tone: over.length ? 'warn' : 'good' })),

      h(Card, { title: 'Departments',
        description: 'Admin reads the department list; HR owns it, under People \u203a Configuration.',
        aside: h(V.Button, { variant: 'outline', className: 'vi-btn--sm', iconEnd: I.right,
          onClick: function () { router.goAs('hr/config/structure'); } }, 'Edit in HR') },
        h(ui.DataTable, {
          exportName: 'departments', label: 'Departments', rows: rows, pageSize: 10,
          columns: [
            { key: 'name', header: 'Department', sortable: true,
              cell: function (d) { return h('strong', null, d.name); } },
            { key: 'code', header: 'Code', cell: function (d) { return h('span', { className: 'mono' }, d.code); } },
            { key: 'headName', header: 'Head', cell: function (d) {
                var e = emp(d.head);
                return e ? h(ui.Person, { employee: e, sub: null }) : h('span', { className: 'muted' }, 'Not assigned');
              } },
            { key: 'location', header: 'Location', cell: function (d) {
                var l = store.location(d.location);
                return l ? l.name : h('span', { className: 'muted' }, '\u2014');
              } },
            { key: 'headcount', header: 'People', numeric: true, align: 'right', sortable: true },
            { key: 'target', header: 'Target', numeric: true, align: 'right',
              cell: function (d) {
                return h('span', { className: d.headcount > d.target ? 'warnx' : 'muted-s' }, d.target);
              } }
          ]
        })));
  }

  function Teams() {
    var rows = store.collection('teams');
    var unled = rows.filter(function (t) { return !t.leadName; });
    function deptName(id) { var d = store.department(id); return d ? d.name : '\u2014'; }
    return h(React.Fragment, null,
      h(Stats, null,
        h(Stat, { label: 'Teams', value: rows.length, sub: 'across ' + Object.keys(rows.reduce(function (m, t) { m[t.department] = 1; return m; }, {})).length + ' departments' }),
        h(Stat, { label: 'People in teams', value: rows.reduce(function (n, t) { return n + t.members; }, 0) }),
        h(Stat, { label: 'Without a lead', value: unled.length,
          sub: unled.length ? unled.map(function (t) { return t.name; }).join(', ') : 'Every team has a lead',
          tone: unled.length ? 'warn' : 'good' })),

      h(Card, { title: 'Teams', description: 'Working groups inside a department, which the department alone does not say.' },
        h(ui.DataTable, {
          exportName: 'teams', label: 'Teams', rows: rows, pageSize: 10,
          columns: [
            { key: 'name', header: 'Team', sortable: true, cell: function (t) { return h('strong', null, t.name); } },
            { key: 'department', header: 'Department', sortable: true,
              csv: function (t) { return deptName(t.department); },
              cell: function (t) { return deptName(t.department); } },
            { key: 'leadName', header: 'Lead', cell: function (t) {
                if (!t.leadName) return h('span', { className: 'warnx' }, 'No lead');
                var e = store.employeeByName(t.leadName);
                return e ? h(ui.Person, { employee: e, sub: null }) : t.leadName;
              } },
            { key: 'members', header: 'Members', numeric: true, align: 'right', sortable: true }
          ]
        })));
  }

  function Numbering() {
    var rows = store.collection('numbering');
    function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
    return h(React.Fragment, null,
      h(Card, { title: 'Employee numbering',
        description: 'The prefix and width every employee ID in this organization is built from.' },
        h(ui.DataTable, {
          exportName: 'numbering', label: 'Numbering', rows: rows,
          columns: [
            { key: 'entity', header: 'Entity', csv: function (n) { var e = seed.entities.filter(function (x) { return x.id === n.entity; })[0]; return e ? e.name : n.entity; },
              cell: function (n) {
                var e = seed.entities.filter(function (x) { return x.id === n.entity; })[0];
                return h('strong', null, e ? e.name : n.entity);
              } },
            { key: 'applies', header: 'Applies to' },
            { key: 'prefix', header: 'Prefix', cell: function (n) { return h('span', { className: 'mono' }, n.prefix); } },
            { key: 'width', header: 'Digits', numeric: true, align: 'right' },
            { key: 'next', header: 'Next number', numeric: true, align: 'right' },
            { key: 'resets', header: 'Resets' },
            { key: 'preview', header: 'Next ID', align: 'right',
              csv: function (n) { return n.prefix + pad(n.next, n.width); },
              cell: function (n) { return h('span', { className: 'mono' }, n.prefix + pad(n.next, n.width)); } }
          ]
        })),
      h(Card, { title: 'How this reads today' },
        h(ui.KeyValue, { rows: [
          ['Highest ID issued', (function () {
            var ids = store.collection('employees').map(function (e) { return e.id; }).sort();
            return ids.length ? ids[ids.length - 1] : '\u2014';
          })()],
          ['People on the books', store.collection('employees').length],
          ['Format', rows.length ? rows[0].prefix + '0'.repeat(rows[0].width) : '\u2014']
        ]})));
  }

  /* ---------------------------------------------------------------- Register */
  HRMS.screens.register({
    'admin/org/profile': CompanyProfile,
    'admin/org/details': OrganizationDetails,
    'admin/org/entities': LegalEntities,
    'admin/org/chart': OrgChart,
    'admin/org/departments': Departments,
    'admin/org/teams': Teams,
    'admin/org/numbering': Numbering,
    'admin/org/locations': Locations,
    'admin/org/workweek': WorkWeek,
    'admin/org/holidays': OrgHolidays,
    'admin/org/settings': OrgSettings,

    'admin/users/all': usersScreen(null, 'All users', 'Every user account with role, status and last sign-in.'),
    'admin/users/active': usersScreen(function (u) { return u.status === 'Active'; }, 'Active users', 'Accounts that can currently sign in.', 'No active users'),
    'admin/users/pending': usersScreen(function (u) { return u.status === 'Pending Invitation'; }, 'Pending invitations', 'Sent but not yet accepted.', 'No invitations outstanding'),
    'admin/users/suspended': usersScreen(function (u) { return u.status === 'Suspended'; }, 'Suspended users', 'Temporarily blocked accounts.', 'No suspended accounts'),
    'admin/users/deactivated': usersScreen(function (u) { return u.status === 'Deactivated'; }, 'Deactivated users', 'Closed accounts retained for audit.', 'No deactivated accounts'),

    'admin/roles/custom': CustomRoles,
    'admin/roles/groups': PermissionGroups,
    'admin/roles/approvals': ApprovalPermissions,

    'admin/billing/plan': CurrentPlan,
    'admin/billing/seats': SeatLimits,
    'admin/billing/history': BillingHistory,
    'admin/billing/invoices': Invoices,
    'admin/billing/methods': PaymentMethods,
    'admin/billing/change': ChangePlan,

    'admin/ai/dashboard': AiDashboard,
    'admin/ai/credits': AiCredits,
    'admin/ai/by-module': AiByModule,
    'admin/ai/by-user': AiByUser,
    'admin/ai/features': AiFeatures,
    'admin/ai/limits': AiLimits,

    'admin/integrations': Integrations,

    'admin/settings/general': settingsScreen('General settings', 'Formats and defaults across the product.', [
      ['Date format', 'DD MMM YYYY'], ['Number format', 'Indian grouping'], ['Week starts on', 'Monday'],
      ['Default language', 'English (India)'], ['Default currency', 'INR (₹)'], ['Time zone', 'Asia/Kolkata']
    ], [['Show employee photos', true], ['Show the org directory to all', true], ['Compact tables by default', false]]),
    'admin/settings/auth': settingsScreen('Authentication', 'How people sign in.', [
      ['Sign-in methods', 'Email and password'], ['Single sign-on', 'Not configured'],
      ['Allowed email domains', 'nexoratech.com'], ['Multi-factor', 'Optional, 38% enrolled']
    ], [['Require multi-factor for Admin', true], ['Allow password sign-in alongside SSO', true], ['Remember devices for 30 days', true]]),
    'admin/settings/passwords': settingsScreen('Password policy', 'Applied at sign-up and every reset.', [
      ['Minimum length', '12 characters'], ['Requires', 'Upper, lower, number, symbol'],
      ['Rotation', 'Every 180 days'], ['Reuse', 'Last 5 passwords blocked'], ['Lockout', '5 failed attempts, 15 minutes']
    ], [['Block common passwords', true], ['Warn on breached passwords', true]]),
    'admin/settings/security': settingsScreen('Security', 'Network and device controls.', [
      ['IP allow-list', 'Not enforced'], ['Device trust', 'Off'],
      ['Lockout threshold', '5 failed attempts'], ['Audit retention', '7 years']
    ], [['Alert on sign-in from a new country', true], ['Alert on permission changes', true], ['Enforce IP allow-list', false]]),
    'admin/settings/sessions': settingsScreen('Sessions', 'How long a session lasts.', [
      ['Session lifetime', '12 hours'], ['Idle timeout', '60 minutes'],
      ['Concurrent sessions', 'Allowed'], ['Forced sign-out', 'On password change']
    ], [['Sign out all devices on password change', true], ['Allow "keep me signed in"', true]]),
    'admin/settings/notifications': settingsScreen('Notification defaults', 'The channels each notification type uses unless a person overrides them.', [
      ['In-app', 'All notification types'], ['Email', 'Leave, payroll, policy and exit events'],
      ['Push', 'Not configured'], ['Digest', 'Daily at 09:00']
    ], [['Let employees change their own channels', true], ['Send a daily digest', true], ['Email approvals immediately', true]]),
    'admin/settings/retention': settingsScreen('Data retention', 'How long records are kept after an employee exits.', [
      ['Exited employee records', '7 years, then anonymised'], ['Payroll records', '8 years (statutory)'],
      ['Attendance records', '3 years'], ['Audit logs', '7 years'], ['Documents', 'Until 1 year after exit']
    ], [['Anonymise instead of deleting', true], ['Allow HR to export before purge', true]]),

    'admin/audit/activity': auditScreen('User activity', 'User activity', 'Who did what, where and when.'),
    'admin/audit/config': auditScreen('Configuration', 'Configuration changes', 'Every configuration edit.'),
    'admin/audit/permissions': auditScreen('Permissions', 'Permission changes', 'Role and permission grants and revocations.'),
    'admin/audit/logins': auditScreen('Security', 'Login history', 'Sign-ins with device and location.'),
    'admin/audit/security': auditScreen('Security', 'Security events', 'Lockouts, policy changes and suspicious activity.'),
    'admin/audit/export': AuditExport
  });
})();
