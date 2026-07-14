'use strict';
'require dom';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';

var callGetStatus = rpc.declare({
	object: 'luci.sfp_speed',
	method: 'getStatus',
	expect: { '': {} }
});

function valueLabel(value) {
	switch (String(value == null ? '' : value)) {
	case '1':
		return _('Automatic (1)');
	case '5':
		return _('100BASE-FX (5)');
	case '4':
		return _('1000BASE-X (4)');
	case '22':
		return _('2500BASE-X (22 / 0x16)');
	case '26':
		return _('10GBASE-R (26 / 0x1a)');
	default:
		return value ? String(value) : _('--');
	}
}

function parameterLabel(available, value) {
	if (!available)
		return _('Unavailable');

	switch (String(value == null ? '' : value).toLowerCase()) {
	case '1':
	case 'y':
	case 'yes':
	case 'true':
		return _('Enabled');
	case '0':
	case 'n':
	case 'no':
	case 'false':
		return _('Disabled');
	default:
		return value ? String(value) : _('--');
	}
}

function parameterRow(label, available, value) {
	return E('div', {}, [
		E('strong', {}, [ label + ':' ]),
		' ', parameterLabel(available, value)
	]);
}

function statusRows(status) {
	var rows = [];

	status = status || {};

	if (!status.available) {
		rows.push(E('div', { 'class': 'alert-message warning' }, [
			_('The RTL837x serdes1_force_mode attribute is unavailable. No runtime change will be attempted.')
		]));
	}
	else {
		rows.push(E('div', {}, [
			E('strong', {}, [ _('Driver force state:') ]),
			' ', valueLabel(status.force_mode)
		]));
		rows.push(E('div', {}, [
			E('strong', {}, [ _('Driver SerDes modes:') ]),
			' ', status.serdes_mode || _('--')
		]));
		rows.push(E('div', {}, [
			E('strong', {}, [ _('SFP port 5 link:') ]),
			' ', status.link_state || _('--')
		]));
	}

	rows.push(E('hr'));
	rows.push(parameterRow(_('DFP 2.5G capability quirk'),
		status.dfp_34x_2c2_2500basex_available,
		status.dfp_34x_2c2_2500basex_value));
	rows.push(parameterRow(_('RTL837x 2.5G no-NWay'),
		status.serdes_2500basex_no_nway_available,
		status.serdes_2500basex_no_nway_value));
	rows.push(parameterRow(_('DFP ignore TX_FAULT quirk'),
		status.dfp_34x_2c2_ignore_tx_fault_available,
		status.dfp_34x_2c2_ignore_tx_fault_value));

	return E('div', {}, rows);
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('sfp-speed'),
			L.resolveDefault(callGetStatus(), {})
		]);
	},

	render: function(data) {
		var m, s, o;
		var initialStatus = data[1] || {};

		m = new form.Map('sfp-speed', _('SFP Speed Control'),
			_('Controls the TL-7DR7299 external SFP+ cage on RTL837x SerDes1. Saving and applying briefly interrupts the SFP link. Automatic mode releases the driver override.'));

		s = m.section(form.NamedSection, 'config', 'sfp', _('Configuration'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enable persistent control'));
		o.default = o.enabled;
		o.rmempty = false;
		o.description = _('When disabled, the service writes value 1 to release the force setting. Reinsert the module or reboot to resume EEPROM-based automatic selection.');

		o = s.option(form.ListValue, 'mode', _('Host SerDes mode'));
		o.value('auto', _('Automatic / release force (1)'));
		o.value('100base-fx', _('100 Mbit/s - 100BASE-FX (5)'));
		o.value('1000base-x', _('1 Gbit/s - 1000BASE-X (4)'));
		o.value('2500base-x', _('2.5 Gbit/s - 2500BASE-X (22 / 0x16)'));
		o.value('10gbase-r', _('10 Gbit/s - 10GBASE-R (26 / 0x1a)'));
		o.default = 'auto';
		o.rmempty = false;
		o.depends('enabled', '1');
		o.description = _('For ODI DFP-34X-2C2 configured internally for 2.5G, select 2500BASE-X. 100BASE-FX is optical 100M mode, not generic 100BASE-T. After returning to Automatic, reinsert the module or reboot so its EEPROM is parsed again.');

		o = s.option(form.Flag, 'dfp_34x_2c2_2500basex', _('DFP-34X-2C2: advertise 2500BASE-X'));
		o.default = o.disabled;
		o.rmempty = false;
		o.description = _('Experimental SFP core quirk. Reinsert the PON stick after changing it so Linux reparses the EEPROM capabilities.');

		o = s.option(form.Flag, 'serdes_2500basex_no_nway', _('RTL837x: disable NWay for 2500BASE-X'));
		o.default = o.disabled;
		o.rmempty = false;
		o.description = _('Experimental RTL837x diagnostic. It takes effect when forced 2500BASE-X is reapplied by Save & Apply.');

		o = s.option(form.Flag, 'dfp_34x_2c2_ignore_tx_fault', _('DFP-34X-2C2: ignore TX_FAULT'));
		o.default = o.disabled;
		o.rmempty = false;
		o.description = _('Lower-probability diagnostic for modules with a stuck TX_FAULT signal. Reinsert the PON stick after changing it.');

		o = s.option(form.DummyValue, '_runtime', _('Runtime status'));
		o.rawhtml = true;
		o.cfgvalue = function() { return ''; };
		o.renderWidget = function() {
			return E('div', { 'id': 'sfp-speed-runtime-status' }, [
				statusRows(initialStatus)
			]);
		};

		return m.render().then(function(node) {
			poll.add(function() {
				return L.resolveDefault(callGetStatus(), {}).then(function(status) {
					var statusNode = document.getElementById('sfp-speed-runtime-status');

					if (statusNode)
						dom.content(statusNode, statusRows(status));
				});
			}, 5);

			return node;
		});
	}
});
