// Globally Used Variables
var UName;
var token;
var goalsObject = {};
var keyOfDefault;

// Constants
const beeURL = 'https://www.beeminder.com/';
const ms = 1000;

// Timeout
var timeoutRefresh;

// Popup Variables
var currentGoalId;
var dpRetryOnConnect;
var KeyedImageArray;
var DisplayArray = [];

// Options Variables
var elementList = [];

/* --- --- --- ---		Global Functions			--- --- --- --- */
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
function xhrHandler( args ) {
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
		xhr.onload = LoadEvent;
		xhr.open( "GET", get_apiurl( args.url ) );
		xhr.send();

	function LoadEvent() {
		var response = JSON.parse( xhr.response );

		if ( xhr.status === 404 ) {
			log( `${ name }${ _i( 'Server 404 error' ) }` );

			if ( isFunc( args.onFail ) )
				args.onFail( response );

			return xhr.abort();
		}

		log( `${ name }${ _i( 'xhr Handler ' ) }` );

		if ( xhr.status === 200 )
			args.onSuccess( response );
	}
}
function log( text, time ){
	if ( !text ) return false;

	// Displaying and logging message
	var span = document.createElement( 'div' );
		span.textContent = text;

	byid( "SeverStatus" ).appendChild( span );
	console.log( text );

	// Timout to blank out display
	setTimeout(
		_ => span.remove(),
		time ? time : 10 * ms
	);
}
function loadFromSettings( cb ) {
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: '',
			token		: '',
			KeyedData	: {},
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
var byid = item => document.getElementById( item );
var ISODate = date => ( new Date( date ) ).toISOString().substring( 0, 10 );
var currentGoal = _ => goalsObject[ currentGoalId ];
var isFunc = func => typeof func === 'function';
var once = ( target, type, func ) =>
	target.addEventListener( type, function listener( e ) {
		target.removeEventListener( type, listener );

		func( e );
	} );
var saveGoals = message =>
	chrome.storage.sync.set(
		{ KeyedData: goalsObject },
		_ => { if ( message ) log( message ); }
	);
var get_apiurl = salt =>
	`${ beeURL }api/v1/users/${ UName }${ salt ? `/${ salt }` : '' }.json?auth_token=${ token }`;

function addClick( elem, func ) {
	if ( typeof elem === 'string' )
		elem = byid( elem );

	return elem.addEventListener( 'click', func );
}
function setCountdownColour() {
	var colour = convertDeadlineToColour( currentGoal().losedate );
	var display = document.querySelector( ".CountdownDisplay" );

	display.style.backgroundColor = colour;
}
function convertDeadlineToColour( losedate ) {
	var daysleft = new countdown( losedate ).days;

	if		( daysleft  >  2 ) return "#39b44a";
	else if ( daysleft === 2 ) return "#325fac";
	else if ( daysleft === 1 ) return "#f7941d";
	else if ( daysleft === 0 ) return "#c92026";
	else if ( daysleft  <  0 ) return "#c92026";

	return "purple";
}
function clearBodyAppendLink( message, url ) {
	var a = document.createElement( 'a' );
		a.textContent = message;
		a.target = '_blank';

	if ( url )
		a.href = url;

	document.body.innerHTML = '';
	document.body.appendChild( a );
}
function find_Default_Or_Newewst_Goal( key ) {
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
function replaceCurrentGoal( replacement ) {
	var newID = replacement.id;
	var oldID = currentGoal().id;

	if ( newID === oldID )
		return goalsObject[ currentGoalId ] = processGoal( replacement );

	throw new Error( `Trying to replace a goal with a non matching goal` );
}
function deleteDeadGoals( goals, now ) {
	// TODO: test if this dead goal removing code works
	for ( var key in goals )
		if ( goals.hasOwnProperty( key ) && goals[ key ].now !== now )
			delete goals[ key ];
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

}
function getGoals_onSuccess( response ) {
	var now = Date.now();

	if ( response.length === 0 )
		return clearBodyAppendLink( 'There are no goals available' ); // TODO: localisation

	DisplayArray = [];

	for ( var goal of response) {
		goal = processGoal( goal, now );

		var id = goal.id;

		goalsObject[ id ] = goal;

		if ( goal.Show )
			DisplayArray.push( goal );
	}

	deleteDeadGoals( goalsObject, now );

	// Store newly constructed data
	saveGoals( _i( "Goal data has been saved" ) );

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
function displayGoal( key ) {
	currentGoalId = find_Default_Or_Newewst_Goal( key );

	var goal = currentGoal();
	var urlroot = `${ beeURL }${ UName }/${ goal.slug }`;

	// Load Image
	loadImageFromMemory( goal.id );
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
	log( _i( "Output Set", currentGoalId ) );
}
function setMetaData( goal ) {
	var lastRoad = goal.fullroad[ goal.fullroad.length - 1 ];

	var updated	= countdown( goal.updated_at, null, null, 1 ).toString();
	var start	= `${ ISODate( goal.initday ) } - ${ goal.initval }`;
	var now		= `${ ISODate( goal.curday ) } - ${ goal.curval }`;
	var target	= `${ ISODate( lastRoad[ 0 ] * ms ) } - ${ lastRoad[ 1 ] }`;
	var targetCD= countdown( lastRoad[ 0 ] * ms, null, null, 2 ).toString();

	byid( 'LastUpdateDate'	).textContent = _i( 'LastUpdate', updated );
	byid( 'Info_Start'		).textContent = start;
	byid( 'Info_Now'		).textContent = now;
	byid( 'Info_Target'		).textContent = target;
	byid( 'Info_Countdown'	).textContent = targetCD;
}
function refreshGoal( i ) {	// Refresh the current goals data
	var req = {};
	var goal = currentGoal();

	// no i arg => call refresh endpoint
	if ( !i ) {
		req.url = `goals/${ goal.slug }/refresh_graph`;
		req.name = _i( 'Refresh ' );
		req.onSuccess = refreshGoal_RefreshCall;
	}

	// Check for new data in goals endpoint
	else {
		req.url = `goals/${ goal.slug }`;
		req.name = _i( 'Refresh - Goal Update' );
		req.onSuccess = _ => refreshGoal_GoalGet( i );
	}

	xhrHandler( req );
}
/**
 * @param {boolean} response
 */
function refreshGoal_RefreshCall( response ) {
	if ( response ) {
		log( _i( 'Waiting for Graph to refresh' ) );
		timeoutRefresh = setTimeout( _ => refreshGoal( 1 ), 2500 );
	}
	else
		log( _i( 'Beeminder Sever Says no' ) );
}
function refreshGoal_GoalGet( i, response ) {
	log( `iteration ${ i }` );

	if ( response.updated_at === currentGoal().updated_at ) {
		if ( i <= 6 ) {
			var nextDelay = delay( i );
			var nextI = i + 1;

			timeoutRefresh = setTimeout( _ => refreshGoal( nextI ), nextDelay );

			log( _i( 'No Update', i, nextDelay ) );
		}

		else
			log( _i( 'The goal seems not to have updated, aborting refresh' ) );
	}

	else {
		replaceCurrentGoal( response );

		displayGoal( currentGoalId );

		saveGoals( _i( 'New goal data has been saved' ) );

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
	setInterval( updateDeadline, ms );

	// Populates meta-data
	byid( 'Label_Start'		).textContent = _i( 'Now' );
	byid( 'Label_Now'		).textContent = _i( 'Start' );
	byid( 'Label_Target'	).textContent = _i( 'Target' );

	addClick( 'datapointRetry', _ => getDatapoints( currentGoal() ) );

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

	addClick( 'save', saveOptions );
	addClick( 'clear', _ => chrome.storage.sync.clear() );
}
function saveOptions() {
	UName = document.getElementById( "username"	).value;
	token = document.getElementById( "token"	).value;

	// Authenticate the credentials are valid
	// TODO: offline handeler - if offline set conection listener
	xhrHandler( {
		name: _i( 'Credential Check' ),
		onSuccess: saveOptions_authSuccess,
		onFail: _ => log( _i( '404: Check details try again' ), 60 * ms )
	} );
}
function saveOptions_authSuccess( response ) {
	chrome.storage.sync.set(
		{
			username	:	UName,
			token		:	token,
		},
		_ => log( _i( 'Options saved.' ) )
	);
	// if (NeuGoalsArray.length === 0){
		xhrHandler( {
			name: "Handle Download",
			url: "goals",
			onSuccess: _ => console.log( response ),
			// onFail	: ItHasFailed,
			// onOffline: ItHasFailed
		} );
	// }
}
function changeDefaultKey( key ) {
	if ( keyOfDefault in goalsObject )
		elementList[ keyOfDefault ].defa.textContent = "-";

	keyOfDefault = key;
	elementList[ keyOfDefault ].defa.textContent = _i( 'Default' );

	chrome.storage.sync.set(
		{ keyOfDefault },
		_ => log( 'Default Saved' ) // TODO: Localisation
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
		title.href = `${ beeURL }${ UName }/${ slug }/`;
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
		"losedate"		: goal.losedate		* ms,	// Date
		"limsum"		: goal.limsum,
		"DataPoints"	:	old.DataPoints,
		"updated_at"	: goal.updated_at	* ms,	// Date
		"initday"		: goal.initday		* ms,	// Date
		"initval"		: goal.initval,
		"curday"		: goal.curday		* ms,	// Date
		"curval"		: goal.curval,
		"lastday"		: goal.lastday		* ms,	// Date
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
	for ( var goal of Object.values( goalsObject ) )
		getDatapoints( goal, true );
}
function getDatapoints( goal, dontDisplay ) {
	var display = !dontDisplay;
	var slug = goal.slug;

	var request = {};
		request.name = `DownloadDatapoints - ${ slug }`; // TODO Localisation
		request.url = `goals/${ slug }/datapoints`;
		request.onSuccess = res => {
			goal.DataPoints = res;

			if ( display )
				displayDatapoints( goal );

			saveGoals();
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
