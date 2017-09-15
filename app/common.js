var
	timeoutLog,					// Info update timeout
	timeoutRefresh,				// Refresh Timeout
	UName,						// Username
	token,						// API Token
	currentGoalId,				// The KeyedGoalsArray key of current goal
	elementList = [],			//
	keyOfDefault,
	dpRetryOnConnect,

	goalsObject = {},		// Goals array using IDs as key
	KeyedImageArray,
	DisplayArray = [];			//

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler( args ) {
	/**
	 * Handles xhr requests
	 * @function xhrHandler
	 * @param {object} args - Object containing instructions
	 * @param {string} args.name - Develper readable name for debugging
	 * @param {string} args.url - Salt for specific API calls
	 * @param {function} args.onSuccess - What to do when successful request has been made
	 * @param {function} args.onOffline - What to do when offline
	 * @param {function} args.onFail - What to do when a 404 has been given
	 */
	if ( !args )
		throw new Error( 'No `args` obj passed to xhr handler' );
	if ( !isFunc( args.onSuccess ) )
		throw new Error( '`args.onSuccess` is not a function' );

	var name = args.name ? `${ args.name } - ` : '';

	// Offline detection
	if ( !navigator.onLine ) {
		if ( isFunc( args.onOffline ) )
			return args.onOffline();
		else
			return log( name + "Currently Offline" );
	}

	// HTTP request
	var xhr = new XMLHttpRequest();
		// xhr.onreadystatechange = StateChange;
		xhr.onload = LoadEvent;
		xhr.open( "GET", get_apiurl( args.url ) );
		xhr.send();

	function LoadEvent() {
		if ( xhr.status === 404 ) {
			log( `${ name }${ _i( 'Server 404 error' ) }` );
			if ( isFunc( args.onFail ) )
				args.onFail( xhr.response );
			xhr.abort();
			return;
		}

		log( `${ name }${ _i( 'xhr Handler ' ) }` );
		if ( xhr.status === 200 && xhr.readyState === 4 )
			args.onSuccess( xhr.response );
	}
}
function get_apiurl( salt ) {
	var augment = salt ? `/${ salt }` : '';

	var url = `https://www.beeminder.com/api/v1/users/${ UName }${ augment }.json?auth_token=${ token }`;

	return url;
}
function isFunc( func ){
	return typeof func === 'function';
}
function log( text, time ){	// informs user and logs event
	// Validation and housekeeping
	if ( !text ) return false;
	if ( timeoutLog ) clearTimeout( timeoutLog );

	// Displaying and logging message
	byid( "SeverStatus" ).textContent = text;
	console.log( text );

	// Timout to blank out display
	timeoutLog = setTimeout(
		_ => {
			byid( "SeverStatus" ).textContent = "";
			timeoutLog = undefined;
		},
		time ? time : 5000
	);
}
function loadFromSettings( cb ) {
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: '',
			token		: '',
			KeyedData	: {},
			GoalsData	: [],
			keyOfDefault: '',
		},
		items => {
			UName			= items.username;
			token			= items.token;
			goalsObject		= items.KeyedData;
			keyOfDefault	= items.keyOfDefault;

			cb( items );
		}
	);
}
/* --- --- --- ---		Helper Functions			--- --- --- --- */
function byid( item ) {
	return document.getElementById( item );
}
function ISODate( date ) {
	return ( new Date( date ) ).toISOString().substring( 0, 10 );
}
function addClick( elem, func ) {
	return elem.addEventListener( 'click', func );
}
function setCountdownColour() {
	var colour = convertDeadlineToColour( currentGoal().losedate );
	var display = document.querySelector( ".CountdownDisplay" );

	display.style.backgroundColor = colour;
}
function convertDeadlineToColour( losedate ) {
	var daysleft = new countdown( losedate ).days;

	if ( daysleft > 2 ) return "#39b44a";
	else if ( daysleft === 2 ) return "#325fac";
	else if ( daysleft === 1 ) return "#f7941d";
	else if ( daysleft === 0 ) return "#c92026";
	else if ( daysleft < 0 ) return "#c92026";

	return "purple";
}
function clearBodyAppendLink( message, url ) {
	var a = document.createElement( 'a' );
		a.textContent = message;
		a.href = url;
		a.target = '_blank';

	document.body.innerHTML = '';
	document.body.appendChild( a );
}
function once( target, type, func ) {
	target.addEventListener( type, function listener( e ) {
		target.removeEventListener( type, listener );

		func( e );
	} );
}
function findNewewstGoal( key ) {
	var latestUpdate = 0;

	if ( key in goalsObject )
		return key;
	else
		for ( var goal of Object.values( goalsObject ) )
			if ( latestUpdate < goal.updated_at ) {
				latestUpdate = goal.updated_at;
				key = goal.id;
			}

	if ( key in goalsObject )
		return key;

	throw new Error( `The goal key is invalid ${ key }` );
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function initialisePopup(){			// Initialises Popup.html
	loadFromSettings( function( items ) {
		if ( !UName || !token )
			clearBodyAppendLink(
				_i( 'You need to enter your details in the options page ' ),
				'/options.html'
			);

		else // TODO else if (!last API req was too soon)
			xhrHandler( {
				name: "Getting goals data",
				url: "goals",
				onSuccess: getGoals_onSuccess,
				onFail: getGoals_onFail.bind( null, 'Download has failed' ),
				onOffline: getGoals_onFail.bind( null, 'No connection available' )
			} );
	} );

	function getGoals_onSuccess( response ) {
		response = JSON.parse( response );

		var goals = goalsObject,
			now = Date.now();

		DisplayArray = [];

		for ( var i = 0; i < response.length; i++ ) {
			var goal = processGoal( response[ i ], now );
			var id = goal.id;

			goals[ id ] = goal;

			if ( goal.Show )
				DisplayArray.push( goal );
		}

		// TODO: test if this dead goal removing code works
		for ( var key in goals )
			if ( goals.hasOwnProperty( key ) && goals[ key ].now !== now )
					delete goals[ key ];

		// Store newly constructed data
		chrome.storage.sync.set(
			{
				KeyedData	: goals,
			},
			_ => log( _i( "Goal data has been saved" ) )
		);

		log( _i( "Data has been downloaded" ) );
		initialiseView( keyOfDefault );
	}
	function getGoals_onFail( message ) {
		message = _i( message );

		if ( Object.values( goalsObject ).length === 0 ) // If there is at least one goal
			return clearBodyAppendLink(
				`${ message }, ${ _i( 'No Goals Available' ) }`,
				'/options.html'
			);

		log( `${ message }, ${ _i( 'initalising from offline data' ) }` );

		initialiseView();
	}
}
function displayGoal( key ) {		// Displays Goal specific information
	// If e is not satisfied or valid, use the current goal
	currentGoalId = key = findNewewstGoal();

	var goal = goalsObject[ key ];
	var urlroot = `https://www.beeminder.com/${ UName }/${ goal.slug }`;

	// Load Image
	imageLoader( goal );

	// Populate content
	byid( 'GoalLoc'	).textContent = goal.title;
	byid( 'limsum'	).textContent = goal.limsum;

	// Set Links
	byid( 'ButtonGoal'		).href = urlroot;
	byid( 'GraphLink'		).href = urlroot;
	byid( 'ButtonData'		).href = `${ urlroot }#data`;
	byid( 'ButtonSettings'	).href = `${ urlroot }#settings`;
	// TODO: Add links to the following : #statistics, #stop, #commitment
	// ByID( 'SOME_ID_YET_TO_BE_MADE' ).href = `${ urlroot }#statistics`;
	// ByID( 'SOME_ID_YET_TO_BE_MADE' ).href = `${ urlroot }#stop`;
	// ByID( 'SOME_ID_YET_TO_BE_MADE' ).href = `${ urlroot }#commitment`;

	// Stop the refresh recursion if it's set
	clearTimeout( timeoutRefresh );

	// Set the deadline colour TODO move to DisplayDeadline()
	setCountdownColour();
	setMetaData( goal );

	getDatapoints( goal );

	// Inform user / Log event
	log( _i( "Output Set", key ) );
}
function setMetaData( goal ) {
	var lastRoad = goal.fullroad[ goal.fullroad.length - 1 ];

	var updated	= countdown( goal.updated_at, null, null, 1 ).toString();
	var start	= `${ ISODate( goal.initday ) } - ${ goal.initval }`;
	var now		= `${ ISODate( goal.curday ) } - ${ goal.curval }`;
	var target	= `${ ISODate( lastRoad[ 0 ] * 1000 ) } - ${ lastRoad[ 1 ] }`;
	var targetCD= countdown( lastRoad[ 0 ] * 1000, null, null, 2 ).toString();

	byid( 'LastUpdateDate'	).textContent = _i( 'LastUpdate', updated );
	byid( 'Info_Start'		).textContent = start;
	byid( 'Info_Now'		).textContent = now;
	byid( 'Info_Target'		).textContent = target;
	byid( 'Info_Countdown'	).textContent = targetCD;
}
function currentGoal( replacement ) {	// Return object for the currently displayed goal or replace it
	if ( replacement ) {
		// If NeuObj is
		if ( goalsObject[ currentGoalId ].id === replacement.id )
			goalsObject[ currentGoalId ] = replacement;

		// If NeuObj is true
		else if ( goalsObject[ currentGoalId ].id !== replacement.id )
			throw new Error( `huh, replacment does not match current` );
	}

	return goalsObject[ currentGoalId ];
}
function refreshGoal( i ) {	// Refresh the current goals data
	var req = {};

	// no i arg => call refresh endpoint
	if ( !i ) {
		req.url = `goals/${ currentGoal().slug }/refresh_graph`;
		req.name = _i( 'Refresh ' );
		req.onSuccess = refreshGoal_RefreshCall;
	}

	// Check for new data in goals endpoint
	else {
		req.url = `goals/${ currentGoal().slug }`;
		req.name = _i( 'Refresh - Goal Update' );
		req.onSuccess = refreshGoal_GoalGet.bind( null, i );
	}

	xhrHandler( req );
}
function refreshGoal_RefreshCall( response ) {
	if ( response === "true" ) {
		log( _i( 'Waiting for Graph to refresh' ) );
		timeoutRefresh = setTimeout( _ => refreshGoal( 1 ), 2500 );
	}
	else
		log( _i( 'Beeminder Sever Says no' ) );
}
function refreshGoal_GoalGet( i, response ) {
	log( `iteration ${ i }` );
	response = JSON.parse( response );

	if ( response.updated_at === currentGoal().updated_at && i <= 6 ) {
		timeoutRefresh = setTimeout(
			_ => refreshGoal( i + 1 ),
			delay( i )
		);

		log( _i( 'No Update', i, delay( i ) ) );
	}

	else if ( response.updated_at === currentGoal().updated_at && i > 6 )
		log( _i( 'The goal seems not to have updated, aborting refresh' ) );

	else {
		console.log( `Testing: What doesn't this do? ${ currentGoal( null ) }` );
		currentGoal( processGoal( response ) );
		displayGoal( currentGoalId );

		chrome.storage.sync.set(
			{ KeyedData: goalsObject },
			_ => log( _i( 'New goal data has been saved' ) )
		);
		log( _i( 'Graph Refreshed', i, currentGoal().updated_at ) );
	}
}
function delay( i ) {
	if ( !i ) return false;
	return 2500 * Math.pow( 2, ( i - 1 ) );
}
function initialiseView( keyToUse ){		// Initialise the display
	// Goal Selector
	if ( DisplayArray.length > 1 )
		createGoalSelector();

	// Populates text and RefreshAction listener in Menu Box
	byid( 'ButtonGoal'		).textContent = _i( 'GOTO' );
	byid( 'ButtonRefresh'	).textContent = _i( 'Refresh' );
	byid( 'ButtonData'		).textContent = _i( 'Data' );
	byid( 'ButtonSettings'	).textContent = _i( 'Settings' );
	byid( 'OptLink'			).textContent = _i( 'Options' );
	byid( 'ButtonRefresh'	).addEventListener( 'click', _ => refreshGoal() );

	// Headings
	byid( 'countdownHeading'	).textContent = _i( 'Deadline' );
	byid( 'bareMinHeading'		).textContent = _i( 'Deadline' );

	// Dealine Updater
	setInterval( updateDeadline, 1000 );

	// Populates meta-data
	byid( 'Label_Start'		).textContent = _i( 'Now' );
	byid( 'Label_Now'		).textContent = _i( 'Start' );
	byid( 'Label_Target'	).textContent = _i( 'Target' );

	byid( 'datapointRetry'	).addEventListener(
		'click', _ => getDatapoints( currentGoal() )
	);

	// Load default goal
	displayGoal( keyToUse );
}
function createGoalSelector( params ) {
	var frag = document.createDocumentFragment();

	for ( var goal of DisplayArray )
		frag.appendChild( createGoalSelctorLink( goal ) );

	byid( 'TheContent' ).appendChild( frag );
}
function createGoalSelctorLink( goal ) {
	var a = document.createElement( 'a' );
		a.className = 'GoalIDBtn';
		a.textContent = goal.title;
		a.addEventListener( 'click', _ => displayGoal( goal.id ) );
		// TODO: Add an additonal goto link w/ each Selector

	return a;
}
function updateDeadline(){
	/**
	 * @function updateDeadline
	 * called by 1 second interval that upadates the deadline countdown
	 */

	var losedate = currentGoal().losedate;

	byid( 'countdownValue' ).innerHTML = countdown( losedate ).toString();

	if ( new Date() > losedate )
		byid( 'countdownFailed' ).textContent = _i( 'Past Deadline!' );

	setCountdownColour();
}
function imageLoader( goal, dontSet ) {	// Loads the image as string
	var url = goal.graph_url;
	var key = goal.id;
	var use = !dontSet;

	// Validation
	if ( !( key in goalsObject ) )
		return log( _i( 'key is invalid', key ) );
	if ( typeof url !== 'string' ) // TODO: Localisation
		return log( `Recieved invalid url: \n${ url }` ); // TODO: Localisation
	if ( url.indexOf( "https://bmndr.s3.amazonaws.com/uploads/" ) !== 0 )
		return log( `Recieved invalid url: \n${ url }` ); // TODO: Localisation

	// Offline detection
	if ( !navigator.onLine ) {
		if ( use )
			loadImageFromMemory( key );

		return once( window, 'online', _ => imageLoader( goal, !use ) );
	}

	var imgxhr = new XMLHttpRequest();
		imgxhr.open( 'GET', `${ url }?${ new Date().getTime() }` );
		imgxhr.responseType = 'blob';
		imgxhr.onload = _ => {
			var status = imgxhr.status;
			if ( status === 200 )
				reader.readAsDataURL( imgxhr.response );

			else if ( status === 404 )
				console.log( _i( '404 expected' ) );

			if ( status !== 200 && use )
				loadImageFromMemory( key );
		};
	var reader = new FileReader();
		reader.onloadend = _ => {
			if ( use )
				byid( 'graph-img' ).src = reader.result;

			accessImageArray(
				_ => {
					KeyedImageArray[ key ] = reader.result;

					chrome.storage.local.set( { KeyedImageArray } );
				}
			);
		};

	imgxhr.send();
}
function loadImageFromMemory( key ) {
	log( _i( 'This graph was loaded from offline storage' ) );
	accessImageArray( _ => byid( 'graph-img' ).src = KeyedImageArray[ key ] );
}
function accessImageArray( cb ) {
	if ( KeyedImageArray )
		cb( KeyedImageArray );
	else
		chrome.storage.local.get(
			'KeyedImageArray',
			items => {
				KeyedImageArray = items.KeyedImageArray;

				if (!KeyedImageArray)
					KeyedImageArray = {};

				cb( KeyedImageArray );
			}
		);
}
/* --- --- --- ---		Options Functions			--- --- --- --- */
function initialiseOptions(){
	loadFromSettings( function ( items ) {
		byid( "username" ).value = UName;
		byid( "token" ).value = token;

		if ( !UName || !token )
			log( _i( 'There be no data' ) );
		else if ( Object.values( goalsObject ).length > 0 )
			drawList();
		else
			log( _i( 'There be no data' ) );
	} );

	document.getElementById( "save" ).addEventListener(
		"click", saveOptions
	);
	document.getElementById( "clear" ).addEventListener(
		"click", _ => chrome.storage.sync.clear()
	);
}
function saveOptions() {
	UName = document.getElementById( "username"	).value;
	token = document.getElementById( "token"	).value;

	// Authenticate the credentials are valid
	// TODO: offline handeler - if offline set conection listener
	xhrHandler( {
		name: _i( 'Credential Check' ),
		onSuccess: saveOptions_authSuccess,
		onFail: _ => log( _i( '404: Check details try again' ), 60000 )
	} );
}
function saveOptions_authSuccess( response ) {
	chrome.storage.sync.set(
		{
			username	:	UName,
			token		:	token,
			keyOfDefault,
		},
		_ => {
			byid( 'status' ).textContent = _i( 'Options saved.' );
			setTimeout( _ => byid( 'status' ).textContent = '', 2000 );
		}
	);
	// if (NeuGoalsArray.length === 0){
		xhrHandler( {
			name: "Handle Download",
			url: "goals",
			onSuccess: _ => console.log( JSON.parse( response ) )//,
			// onFail	: ItHasFailed,
			// onOffline: ItHasFailed
		} );
	// }
}
function clearChromeData () {
	//
	chrome.storage.sync.clear();

	// document.getElementById( "username"	).value = "";
	// document.getElementById( "token"	).value = "";
	// ^^^^ commented out for development reasons
}
function changeDefaultKey( key ) {
	if ( keyOfDefault in goalsObject )
		elementList[ keyOfDefault ].defa.textContent = "-";

	keyOfDefault = key;
	elementList[ keyOfDefault ].defa.textContent = _i( 'Default' );

	chrome.storage.sync.set(
		{ keyOfDefault },
		_ => log( 'Default Saved' )
	);
}
function drawList() {
	var frag = document.createDocumentFragment();

	for ( var goal of Object.values( goalsObject ) ) {
		var listItem = makeListItem( goal );

		frag.appendChild( listItem.item );
	}

	byid( 'TheList' ).appendChild( frag );

	if ( keyOfDefault in goalsObject )
		elementList[ keyOfDefault ].defa.innerHTML = _i( 'Default' );

	else {
		// TODO: No default code
	}
}
function makeListItem( goal ) {
	var slug = goal.slug;
	var id = goal.id;

	var item = document.createElement( 'li' );
		item.className = 'item';
		item.id = `${ slug }-item`;

	var pack = { slug, item };

	var title = makeListLink( 'title', `title`, goal.title, pack );
		title.href = `https://www.beeminder.com/${ UName }/${ slug }/`;
	var defa = makeListLink( 'default', `defaultBtn`, '-', pack );
	var hide = makeListLink( 'hide', `HideBtn`, goal.Notify, pack );
	var notify = makeListLink( 'notify', `NotifyBtn`, goal.Show, pack );

	addClick( defa, _ => changeDefaultKey( id ) );
	// addClick( hide, MakeGoalsArray );
	// addClick( notify, _ => NotifyHandle( i ) );

	return elementList[ id ] = { item, title, defa, hide, notify, };
}
function makeListLink( className, id, text, { slug, item } ) {
	var elem = document.createElement( 'a' );
		elem.className = className;
		elem.id = `${ slug }-${ id }`;
		elem.textContent = text;

	item.appendChild( elem );

	return elem;
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
function processGoal( goal, now ) {
	var id = goal.id;

	var old = id in goalsObject
		? goalsObject[ id ]
		: { // TODO: Implement a Default options set
			"DataPoints": [],
			Notify: true,
			Show: true
		};

	// Return object with local settings added and dates formated into UNIX integer
	return {
		"slug"			: goal.slug,
		"title"			: goal.title,
		"description"	: goal.description,
		"id"			: goal.id,
		"losedate"		: goal.losedate		*1000,	// Date
		"limsum"		: goal.limsum,
		"DataPoints"	:	old.DataPoints,
		"updated_at"	: goal.updated_at	*1000,	// Date
		"initday"		: goal.initday		*1000,	// Date
		"initval"		: goal.initval,
		"curday"		: goal.curday		*1000,	// Date
		"curval"		: goal.curval,
		"lastday"		: goal.lastday		*1000,	// Date
		"fullroad"		: goal.fullroad,
		"graph_url"		: goal.graph_url,
		"thumb_url"		: goal.thumb_url,
		"Notify"		:	old.Notify,
		"Show"			:	old.Show,
		"now"			:	now,
		"autodata"		: goal.autodata
	};
}
function getAllDatapoints() {
	for ( var id of Object.keys( goalsObject ) )
		getDatapoints( goalsObject[ id ], true );
}
function getDatapoints( goal, dontDisplay ) {
	var display = !dontDisplay;
	var slug = goal.slug;

	var request = {};
		request.name = `DownloadDatapoints - ${ slug }`; // TODO Localisation
		request.url = `goals/${ slug }/datapoints`;
		request.onSuccess = res => {
			goal.DataPoints = JSON.parse( res );

			if ( display )
				displayDatapoints( goal );

			chrome.storage.sync.set( { KeyedData: goalsObject } );
		};

	if ( display ) {
		request.onFail = _ => displayDatapoints( goal, 'The Download has failed!</br>Click here to try again!' );

		request.onOffline = _ => {
			displayDatapoints( goal, 'The Download has failed!</br>Click here to try again!' );

			if ( !dpRetryOnConnect ) {
				once( window, 'online', _ => {
					dpRetryOnConnect = false;
					getDatapoints( goal );
				} );

				dpRetryOnConnect = true;
			}
		};
	}

	// API requsest for datapoints
	xhrHandler( request );
}
function displayDatapoints( goal, error ) {
	var points = goal.DataPoints;

	// Create datapoints list
	var iCap = points.length <= 10 ? points.length : 10;
	var str = '';
	for ( var i = 0; i < iCap; i++ )
		str += points[ i ].canonical + '</br>';

	// Poulate datapoints section // TODO: Localisation
	byid( 'dataPointStats'	).innerHTML = `Number of Datapoints : ${ points.length }`;
	byid( 'dataPoints' ).innerHTML = str;

	var retry = byid( 'datapointRetry' );

	if ( error ) {
		retry.innerHTML = error;
		retry.classList.remove( 'hide' );
	}
	else
		retry.innerHTML = '';
		retry.classList.add( 'hide' );
}
