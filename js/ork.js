window.Ork = new function(){
	this.ork = "https://amtgard.com/ork/orkservice/Json/index.php";

	/***********
	
		Modes
			default => no particular mode; do the defaults
			choose-default-action => choosing default action setting
			choose-player-terms => choose player search terms
			choose-action => choosing the current event target
	
	***********/
	this.appMode = "default",
	this.actionMode = "parkattendance", // or eventattendance
	this.playerSearchTerms = { kingdom_id: 'Any', park_id: 'Any' },
	this.currentTarget = {},
	this.lastKingdom = "",
	this.lastEntryDate = new Date().toJSON().slice(0,10),
	this.lastEntryCredits = 1,
	
	this.initStorage = function() {
		var store;
		try {
			store = JSON.parse(localStorage.getItem('orkmobile'));
		} catch(e) {
			store = null;
		}
		if (store === null) {
			store = {
				preferences: {
					rememberLogin: {
						remember: true,
						username: "",
						password: "",
						token: false
					},
					defaultAction: {
						action: false,
						mode: "none",
						details: {}
					}
				},
				cache: {
					mundanes: {},
					kingdoms: {},
					parks: {},
					events: {},
					event_dates: {}
				},
				commitq: []
			};
		}
		localStorage.setItem('orkmobile', JSON.stringify(store));
	},

	this.rememberMe = function(remember, username, password) {
		var store = JSON.parse(localStorage.getItem('orkmobile'));
		if (typeof remember != 'undefined') {
			store.preferences.rememberLogin.remember = remember;
			store.preferences.rememberLogin.username = username;
			store.preferences.rememberLogin.password = password;
			localStorage.setItem('orkmobile', JSON.stringify(store));
		}
		return store.preferences.rememberLogin;
	},
	
	this.defaultAction = function(action, mode, details) {
		var store = JSON.parse(localStorage.getItem('orkmobile'));
		if (typeof action != 'undefined') {
			store.preferences.defaultAction.action = action;
			store.preferences.defaultAction.mode = mode;
			store.preferences.defaultAction.details = details;
			localStorage.setItem('orkmobile', JSON.stringify(store));
		}
		return store.preferences.defaultAction;
	},
	
	this.token = function(token) {
		var store = JSON.parse(localStorage.getItem('orkmobile'));
		if (typeof token != 'undefined') {
			store.preferences.rememberLogin.token = token;
			localStorage.setItem('orkmobile', JSON.stringify(store));
		}
		if (store.preferences.rememberLogin.remember == false || store.preferences.rememberLogin.token.length != 32)
			return false;
		return store.preferences.rememberLogin.token;
	},
	
	this.storeKingdoms = function(k) {
		store = JSON.parse(localStorage.getItem('orkmobile'));
		store.cache.kingdoms = k;
		localStorage.setItem('orkmobile', JSON.stringify(store));
	},
	
	this.makeArray = function(objs) {
		return $.map(objs, function(value, index) {
			return [value];
		});
	},
		
	this.kingdoms = function(set_data) {
		var k = JSON.parse(localStorage.getItem('orkmobile')).cache.kingdoms;
		if (Object.keys(k).length == 0) {
			$.getJSON( Ork.ork + "?request=",
				{
					call: "Kingdom/GetKingdoms",
					request: {}
				},
				function(data) {
					if (data.Status.Status == 0) {
						Ork.storeKingdoms(data.Kingdoms);
						set_data(Ork.makeArray(data.Kingdoms).sort(function(a,b) { return a.KingdomName.localeCompare(b.KingdomName); }));
					}
				});
		} else {
			set_data(Ork.makeArray(k).sort(function(a,b) { return a.KingdomName.localeCompare(b.KingdomName); }));
		}
	},
	
	this.storeParks = function(kingdom_id, p) {
		store = JSON.parse(localStorage.getItem('orkmobile'));
		store.cache.parks[kingdom_id] = p;
		localStorage.setItem('orkmobile', JSON.stringify(store));
	},
	
	this.parks = function(kingdom_id, set_data) {
		kingdom_id = kingdom_id.kingdom_id;
		var p = JSON.parse(localStorage.getItem('orkmobile')).cache.parks[kingdom_id];
		if (typeof p == 'undefined' || Object.keys(p).length == 0) {
			$.getJSON( Ork.ork,
				{
					call: "Kingdom/GetParks",
					request: {
						KingdomId: kingdom_id
					}
				},
				function(data) {
					if (data.Status.Status == 0) {
						var parks = {};
						for (var p = 0; p < data.Parks.length; p++)
							if (data.Parks[p].Active == 'Active')
								parks[data.Parks[p].ParkId] = data.Parks[p];
						Ork.storeParks(kingdom_id, parks);
						set_data(Ork.makeArray(parks).sort(function(a,b) { return a.Name.localeCompare(b.Name); }));
					}
				});
		} else {
			set_data(Ork.makeArray(p).sort(function(a,b) { return a.Name.localeCompare(b.Name); }));
		}
	},
	
	this.storeMundanes = function(kingdom_id, park_id, mundane_id, persona, class_id) {
		store = JSON.parse(localStorage.getItem('orkmobile'));
		if (store.cache.mundanes[kingdom_id] === undefined)
			store.cache.mundanes[kingdom_id] = {};
		if (store.cache.mundanes[kingdom_id][park_id] === undefined)
			store.cache.mundanes[kingdom_id][park_id] = {};
		if (typeof persona != 'undefined')
			store.cache.mundanes[kingdom_id][park_id][mundane_id] = { persona: persona, class_id: class_id };
		localStorage.setItem('orkmobile', JSON.stringify(store));
		return Ork.makeArray(store.cache.mundanes[kingdom_id][park_id]);
	},
	
	this.filterMundanes = function(mundanes, term) {
		
	},
	
	this.getMundanes = function(kingdom_id, park_id) {
		return this.storeMundanes(kingdom_id, park_id);
	},
	
	this.searchMundanes = function(kingdom_id, park_id, term, set_data) {
		$.getJSON( Ork.ork,
			{
				call: "SearchService/Player",
				type: 'All',
				search: term,
				kingdom_id: kingdom_id,
				park_id: park_id
			},
			function(data) {
				if (data.Status.Status == 0 || data.Status == true) {
					set_data(Ork.makeArray(data.Result).sort(function(a,b) { return a.Persona.localeCompare(b.Persona); }));
				}
			});
	},
	
	this.storeAttendance = function(type, mundane_id, persona, class_id, date, credits, flavor, park_id, calendar_event_id) {
		var store = JSON.parse(localStorage.getItem('orkmobile'));
		store.commitq.push({
			type: type,
			mundane_id: mundane_id,
			class_id: class_id,
			date: date,
			credits: credits,
			flavor: flavor,
			park_id: park_id,
			calendar_event_id: calendar_event_id
		});
		localStorage.setItem('orkmobile', JSON.stringify(store));
		Ork.lastEntryDate = date;
	},

	this.pushAttendance = function(q_id, type, mundane_id, persona, class_id, date, credits, flavor, park_id, calendar_event_id, success, failure) {
		$.getJSON( Ork.ork, 
			{
				call: "Attendance/AddAttendance",
				request: {
					Token: Ork.token(),
					MundaneId: mundane_id,
					Persona: persona,
					ClassId: class_id,
					Date: date,
					Credits: credits,
					Flavor: flavor,
					Note: null,
					ParkId: park_id,
					EventCalendarDetailId: calendar_event_id
				}
			},
			function(data) {
				if (data.Status == 5) {
					failure(q_id);
				} else {
					Ork.storeMundanes(Ork.currentTarget.kingdom_id, park_id, mundane_id, persona, class_id);
					success(q_id);
				}
			});
	},
	
	this.fetchCurrentAttendance = function(date, kingdom_id, park_id, set_date) {
		$.getJSON( Ork.ork, 
			{
				call: "Report/AttendanceForDate",
				request: {
					Date: date,
					KingdomId: kingdom_id,
					ParkId: park_id
				}
			},
			function(data) {
				if (data.Status.Status == 0) {
					set_date(data.Attendance);
				}
			});
	},
	
	this.removeAttendance = function(attendance_id, success, failure) {
		$.getJSON( Ork.ork, 
			{
				call: "Attendance/RemoveAttendance",
				request: {
					Token: Ork.token(),
					AttendanceId: attendance_id
				}
			},
			function(data) {
				if (data.Status == 0) {
					success(attendance_id);
				} else {
					failure(attendance_id);
				}
			});
	},
	
	this.login = function(username, password, success, failure) {
		$.getJSON( Ork.ork, 
			{
				call: "Authorization/Authorize",
				request: {
					UserName: username,
					Password: password
				}
			},
			function(data) {
				if (data.Status.Status == 0) {
					if (Ork.rememberMe().remember) {
						Ork.rememberMe(true, username, password);
						Ork.token(data.Token);
					}
					success();
				} else {
					Ork.token(false);
					if (Ork.rememberMe().remember) {
						Ork.rememberMe(true, "", "");
					}
				}
			});
	}
	
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};