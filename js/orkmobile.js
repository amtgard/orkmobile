phonon.options({
    navigator: {
        defaultPage: 'home',
        animatePages: true,
        enableBrowserBackButton: true,
        templateRootDirectory: './tpl'
    },
    i18n: null // for this example, we do not use internationalization
});

var orkmobile = phonon.navigator();

phonon.onReady(function() {
  basicPageSetup();
  var orktoken = Ork.token();
  if (!Ork.token()) {
    phonon.navigator().changePage('login');
  } else {
		Ork.appMode = "choose-action";
		if (!Ork.currentTarget.kingdom_id)
			phonon.navigator().changePage('choosekingdom');
		else if (!Ork.currentTarget.park_id)
			phonon.navigator().changePage('choosepark');
  }
});

/*****************************************

  HOME / OPERATIONS

******************************************/
orkmobile.on({page: 'home', preventClose: false, content: 'operations.html'});

/*****************************************

  CHOOSE KINGDOM

******************************************/
orkmobile.on({page: 'choosekingdom', preventClose: false, content: 'choosekingdom.html', readyDelay: 1}, function(activity) {
  activity.onReady(function() {
    $('choosekingdom').on('click', '.kingdom', function() {
      Ork.lastKingdom = $(this).text();
      switch (Ork.actionMode) {
        case "parkattendance":
            phonon.navigator().changePage('choosepark', $(this).attr('kingdom-id'));
          break;
      }
    });  
    
    $('choosekingdom #kingdom-chooser-list').empty();
    
    Ork.kingdoms(function(kingdoms) {
      for (var k in kingdoms) {
        $('choosekingdom #kingdom-chooser-list').append('<li class="kingdom padded-list" kingdom-id="' + kingdoms[k].KingdomId + '">' + kingdoms[k].KingdomName + '</li>');
      }
    });
  });
  
});

/*****************************************

  CHOOSE PARK

******************************************/
orkmobile.on({page: 'choosepark', preventClose: false, content: 'choosepark.html', readyDelay: 1}, function(activity) {
	activity.onReady(function() {
		$('choosepark').on('click', '.park', function() {
			var kingdom_id = $(this).attr('kingdom-id');
			var park_id = $(this).attr('park-id');
			var park_n = $(this).text();
			Ork.currentTarget = { kingdom_id: kingdom_id.kingdom_id, park_id: park_id, kingdom: Ork.lastKingdom, park: park_n };
			Ork.playerSearchTerms = { kingdom_id: kingdom_id.kingdom_id, park_id: park_id, kingdom: Ork.lastKingdom, park: park_n };
			phonon.navigator().changePage('parkattendance');
		});	
	});
	
	activity.onHashChanged(function(kingdom_id) {
    $('choosepark #park-chooser-list').empty();
    var page = phonon.navigator().currentPage;
    
    Ork.parks({kingdom_id: kingdom_id}, function(parks) {
      for (var p in parks) {
        $('choosepark #park-chooser-list').append('<li class="park padded-list" kingdom-id="' + kingdom_id + '" park-id="' + parks[p].ParkId + '">' + parks[p].Name + '</li>');
      }
    });
  });
});

/*****************************************

  ENTER PARK ATTENDANCE

******************************************/
orkmobile.on({page: 'parkattendance', preventClose: false, content: 'parkattendance.html', readyDelay: 1}, function(activity) {
	activity.onCreate(function() {		
		$('parkattendance #class-selector').on('click', '[class_id]', function() {
			Ork.currentTarget.class_id = $(this).attr('class_id');
			$('[name=player-class]').text($(this).text());
			phonon.panel('#class-selector').close();
		});
		
		/********************************
			PLAYER SEARCH PARK SELECTION
		********************************/
		$('parkattendance').on('click', '[name=players-park]', function() {
			$('parkattendance #kingdoms').empty();
		    Ork.kingdoms(function(kingdoms) {
				for (var k in kingdoms) {
					$('parkattendance #kingdoms').append('<li class="kingdom padded-list" kingdom-id="' + kingdoms[k].KingdomId + '">' + kingdoms[k].KingdomName + '</li>');
				}
				phonon.panel('#kingdom-selector').open();
			});
		});
		$('parkattendance #kingdoms').on('click', '[kingdom-id]', function() {
			$('parkattendance #parks').empty();
			Ork.playerSearchTerms.kingdom_id = $(this).attr('kingdom-id');
			Ork.parks({kingdom_id: Ork.playerSearchTerms.kingdom_id}, function(parks) {
				for (var p in parks) {
					$('parkattendance #parks').append('<li class="park padded-list" kingdom-id="' + Ork.playerSearchTerms.kingdom_id + '" park-id="' + parks[p].ParkId + '">' + parks[p].Name + '</li>');
				}
				phonon.panel('#park-selector').open();
			});
		});
		$('parkattendance #parks').on('click', '[park-id]', function() {
			Ork.playerSearchTerms.park_id = $(this).attr('park-id');
			$('parkattendance [name=players-park]').text($(this).text());
			phonon.panel('#park-selector').close() 
			setTimeout(function() { 
				phonon.panel('#kingdom-selector').close();
			}, 500);
		});
		
		/********************************
			PLAYER SEARCH
		********************************/
		$('parkattendance').on('click', '[name=player]', function() {
			$('parkattendance #players').empty();
			var mundanes_players = Ork.getMundanes(Ork.playerSearchTerms.kingdom_id, Ork.playerSearchTerms.park_id);
			var mundanes = Ork.getMundanes(Ork.currentTarget.kingdom_id, Ork.currentTarget.park_id);
			
			for (var mundane_id in mundanes_players)
				mundanes[mundane_id] = mundanes_players[mundane_id];
			for (var mundane_id in mundanes) {
				if (typeof mundanes[mundane_id].class_id != 'undefined' && mundane_id > 0)
					$('parkattendance #players').append('<li class="app-button player" mundane_id="' + mundane_id + '" default_class_id="' + mundanes[mundane_id].class_id + '">' + mundanes[mundane_id].persona + '</li>');
			}
			phonon.panel('#player-selector').open();
		});
		$('#search-players').on('keyup', $.debounce($.throttle(function() {
			window.PersonaSearchInProgress = true;
			$(this).removeClass('blue');
			if ($('#search-players').val().length > 2) {
				Ork.searchMundanes(Ork.playerSearchTerms.kingdom_id, Ork.playerSearchTerms.park_id, $('#search-players').val(), function(data) {
					$('parkattendance #players').empty();
					for (var m in data) {
						$('parkattendance #players').append('<li class="app-button player" mundane-id="' + data[m].MundaneId + '">' + data[m].Persona + '</li>');
					}
				});
			}
		}, 500), 250));
		$('parkattendance #players').on('click', '[mundane-id]', function() {
			Ork.currentTarget.mundane_id = $(this).attr('mundane-id');
			Ork.currentTarget.persona = $(this).text();
			$('parkattendance [name=player]').text($(this).text());
			phonon.panel('#player-selector').close();
		});
		
		/********************************
			ENTER & SHOW ATTENDANCE
		********************************/
		$('parkattendance').on('change', '[name=date]', function() {
			Ork.lastEntryDate = $(this).val();
			loadParkAttendance();
		});
		$('parkattendance').on('click', '[name=enter-attendance]', function() {
			// function(q_id, type, mundane_id, persona, class_id, date, credits, flavor, park_id, calendar_event_id, success)
			var mundane_id = Ork.currentTarget.mundane_id;
			var persona = Ork.currentTarget.persona;
			var class_id = Ork.currentTarget.class_id;
			var date = Ork.lastEntryDate;
			var credits = 1;
			var flavor = "";
			var park_id = Ork.currentTarget.park_id;
			var calendar_event_id = 0;
			Ork.pushAttendance(-202, "Park", mundane_id, persona, class_id, date, credits, flavor, park_id, calendar_event_id, function(q_id) {
				Ork.lastEntryDate = date;
				Ork.lastEntryCredits = credits;
				Ork.currentTarget.mundane_id = 0;
				$('parkattendance [name=player]').text("Player");
				Ork.currentTarget.class_id = 0;
				$('parkattendance [name=player-class]').text("Class");
				phonon.navigator().changePage('parkattendance');
				loadParkAttendance()
			}, function(q_id) {
				var title = "Insufficient Privileges";
				var text = "You do not have enough privileges to record some of the attendance.";
				var textOk = "Change Login";
				var cancelable = false; 
				var alert = phonon.alert(text, title, cancelable, textOk);
				alert.on('confirm', logout );
			});
		});
		$('parkattendance').on('click', '[delete-attendance-id]', function() {
			var delete_id = $(this).attr('delete-attendance-id');
			Ork.removeAttendance(delete_id, function() {
				loadParkAttendance();
			}, function() {
				loadParkAttendance();
			});
		});
	});

	activity.onReady(function() {
		$('parkattendance h1[class="title"]').text(Ork.currentTarget.park);
		$('parkattendance [name="date"]').val(Ork.lastEntryDate);
		$('parkattendance [name=players-park]').text(Ork.playerSearchTerms.park);
		loadParkAttendance();
	});
	
	activity.onHashChanged(function() {
		$('parkattendance h1[class="title"]').text(Ork.currentTarget.park);
		$('parkattendance [name="date"]').val(Ork.lastEntryDate);
		$('parkattendance [name=players-park]').text(Ork.playerSearchTerms.park);
		loadParkAttendance();
	});
});

/*****************************************

  SETTINGS

******************************************/
orkmobile.on({page: 'settings', preventClose: false, content: 'settings.html', readyDelay: 1}, function(activity) {
  activity.onCreate(function() {
  });
});

/*****************************************

  LOGIN

******************************************/
orkmobile.on({page: 'login', preventClose: false, content: 'login.html', readyDelay: 1}, function(activity) {
  activity.onCreate(function() {
    var remember = Ork.rememberMe();
    Ork.appMode = "choose-action";
    // Set page defaults
    if (remember.remember) {
      $('login [name=remember-me]').attr('checked','checked');
    }

    // Auto login if requested by the user
    if (remember.remember && Ork.token()) {
      phonon.navigator().changePage("home");
    } else if (remember.remember && remember.username.length > 0 && remmeber.password.length > 0) {
      $('login [name=login]').val(remember.username);
      $('login [name=password]').val(remember.password);
    }

    // Login action
    document
      .querySelector('.login')
      .on('tap', function() {
        var username = $('login [name=login]').val();
        var password = $('login [name=password]').val()
        if ($('login [name=remember-me]').prop('checked'))
        Ork.rememberMe(true, username, password);

        Ork.login(username, password, function() {
            phonon.navigator().changePage("home");
          }, function() {
            logout();
          });
      });
  });
});

/**************************************

	HELPER FUNCTIONS
	
**************************************/

function basicPageSetup() {
  $(document).on('click', '.logout', function() {
    logout();
  });
  $(document).on('click', '.settings', function() {
    phonon.navigator().changePage('settings');
  })
}

function logout(remembrance) {
	Ork.rememberMe(typeof remembrance != 'undefined', "", "");
	Ork.token(false);
  phonon.navigator().changePage('login');
}

function loadParkAttendance() {
	$('#current-attendance').empty();
	Ork.fetchCurrentAttendance(Ork.lastEntryDate, Ork.currentTarget.kingdom_id, Ork.currentTarget.park_id, function(attendance) {
		for (var a in attendance)
			$('#current-attendance').append(
				'<li class="item-expanded">' +
					'<a delete-attendance-id="' + attendance[a].AttendanceId + '" href="#action" class="pull-right icon material-icons">clear</a>' + 
					'<div class="item-content overflow-none">' +
						'<span class="title">' + attendance[a].Persona + '</span>' + 
						'<span class="body">' + attendance[a].ClassName + '</span>' +
					'</div>' +
				'</li>');
	});
}
