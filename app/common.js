// Globally Used Variables
var UName;
var token;
var goalsObject = {};
var keyOfDefault;

// Constants
const BEE_URL = 'https://www.beeminder.com/';
const MS = 1000;
const MAX_POINTS = 10;

// Timeout
var timeoutRefresh;

// Popup Variables
var currentGoalId;
var dpRetryOnConnect;
var KeyedImageArray;

// Options Variables
var elementList = [];

/* --- --- --- ---		Global Functions			--- --- --- --- */
/**
 * Handles xhr requests
 * @function xhrHandler
 * @param {object} args - Object containing instructions
 * @param {string} args.url - Salt for specific API calls
 * @param {array} args.parameters - An array of objects that represent API parameters
 * @param {function} args.onSuccess - What to do when successful request has been made
 * @param {function} args.onOffline - What to do when offline
 * @param {function} args.onFail - What to do when a 404 has been given
 */
function xhrHandler( args ) {
	// Offline detection
	if ( !navigator.onLine ) {
		if ( isFunc( args.onOffline ) )
			args.onOffline();

		return;
	}

	var url = get_apiurl( args.url );

	if ( args.parameters )
		url = args.parameters.reduce(
			( str, tuple ) => `${ str }&${ tuple[ 0 ] }=${ tuple[ 1 ] }`,
			url
		);

	console.log( url );

	// HTTP request
	var xhr = new XMLHttpRequest();
		xhr.onload = LoadEvent;
		xhr.open( "GET", url );
		xhr.send();

	function LoadEvent() {
		var response = JSON.parse( xhr.response );

		if ( xhr.status === 404 ) {
			if ( isFunc( args.onFail ) )
				args.onFail( response );

			return xhr.abort();
		}

		if ( xhr.status === 200 && isFunc( args.onSuccess ) )
			args.onSuccess( response );
	}
}
/**
 * Logs informations to the view and console
 */
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
		time ? time : 10 * MS
	);
}
/**
 * Loads settings and cahced data, populates volatile memory then callsback
 */
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
var delay = i => 2.5 * MS * Math.pow( 2, ( i - 1 ) );
var roadTransform = ([ time, goal, rate ]) => ({ time: time * MS, goal, rate });
var countdownUnits = ( value, units ) => countdown( value, null, null, units );
/** One time event lister */
var once = ( target, type, func ) =>
	target.addEventListener( type, function listener( e ) {
		target.removeEventListener( type, listener );

		func( e );
	} );
/** Saves goal data and informs user of success */
var saveGoals = message =>
	chrome.storage.sync.set(
		{ KeyedData: goalsObject },
		_ => { if ( message ) log( message ); }
	);
/** Returns API URL */
var get_apiurl = salt =>
	`${ BEE_URL }api/v1/users/${ UName }${ salt ? `/${ salt }` : '' }.json?auth_token=${ token }`;

/**
 * Abstraction that ataches click enent listener
 */
function addClick( elem, func ) {
	if ( typeof elem === 'string' )
		elem = byid( elem );

	return elem.addEventListener( 'click', func );
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
/**
 * Returns string that represents a is used to access goals object, depending on if argument is valid, default key is valid, else the newest key will be returned
 */
function find_Default_Or_Newewst_Goal( key ) {
	var toDisplay = getShowable();
	var latestUpdate = 0;

	if ( key in goalsObject )
		return key;
	else if ( keyOfDefault in goalsObject )
		return keyOfDefault;
	else
		for ( var goal of toDisplay )
			if ( latestUpdate < goal.updated_at ) {
				latestUpdate = goal.updated_at;
				key = goal.id;
			}

	if ( key in goalsObject )
		return key;

	throw new Error( `The goal key is invalid ${ key }` );
}
/**
 * Replacase current goal with leaner object, then disaplys and saves
 */
function replaceCurrentGoal( replacement, message ) {
	if ( replacement.id !== currentGoalId )
		throw new Error( `Trying to replace a goal with a non matching goal` );

	goalsObject[ currentGoalId ] = processGoal( replacement );
	displayGoal( currentGoalId );
	saveGoals( message );
}
/**
 * Processes an array of goals into a leaner object of goals, then saves
 */
function processRawGoals( array, object ) {
	var now = Date.now();

	for ( var goal of array )
		object[ goal.id ] = processGoal( goal, now );

	// TODO: test if this dead goal removing code works
	for ( var key in object ) {
		if ( object.hasOwnProperty( key ) && object[ key ].now !== now )
			delete object[ key ];
		else
			delete object[ key ].now;
	}

	saveGoals( _i( "Goal data has been saved" ) );
}
/**
 * Returns a goal-object optimsed for limited storage space
 * Preseving existing options
 */
function processGoal( goal, now ) {
	var id = goal.id;

	var old = id in goalsObject
		? goalsObject[ id ]
		: { // TODO: Implement a Default options set
			dataPoints: [],
			notify: true,
			show: true
		};

	var points = goal.dataPoints ? goal.dataPoints : old.dataPoints;

	var ret = {
		slug		: goal.slug,
		title		: goal.title,
		description	: goal.description,
		id			: goal.id,
		limsum		: goal.limsum,
		initval		: goal.initval,
		curval		: goal.curval,
		fullroad	: goal.fullroad,
		graph_url	: goal.graph_url,
		thumb_url	: goal.thumb_url,
		autodata	: goal.autodata,

		losedate	: goal.losedate		* MS,
		updated_at	: goal.updated_at	* MS,
		initday		: goal.initday		* MS,
		curday		: goal.curday		* MS,
		lastday		: goal.lastday		* MS,

		dataPoints	: points,

		notify		:	old.notify,
		show		:	old.show,
	};

	if ( now ) ret.now = now;

	return ret;
}
/**
 * Returns array of goals to display
 */
function getShowable() {
	var goals = Object.values( goalsObject );
		goals.sort( ( a, b ) => {
			var x = a.title.toUpperCase();
			var y = b.title.toUpperCase();

			if ( x < y ) return -1;
			if ( x > y ) return  1;

			return 0;
		} );

	var showable = goals.filter( g => g.show || g.id === keyOfDefault );

	if ( showable.length !== 0 )
		return showable;

	if ( goals.length !== 0 )
		return goals;

	// TODO: ????
	console.log( 'there are no goals' );

	return goals;
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
/**
 * Calls storage loader and populates DOM with stateless text
 */
function initialisePopup(){
	loadFromSettings( popupStorageCallback );

	// Populates text and RefreshAction listener in Menu Box
	byid( 'ButtonGoal'		).textContent = _i( 'GOTO' );
	byid( 'ButtonRefresh'	).textContent = _i( 'Refresh' );
	byid( 'ButtonData'		).textContent = _i( 'Data' );
	byid( 'ButtonSettings'	).textContent = _i( 'Settings' );
	byid( 'OptLink'			).textContent = _i( 'Options' );
	byid( 'countdownHeading').textContent = _i( 'Deadline' );
	byid( 'bareMinHeading'	).textContent = _i( 'Deadline' );
	byid( 'Label_Start'		).textContent = _i( 'Now' );
	byid( 'Label_Now'		).textContent = _i( 'Start' );
	byid( 'Label_Target'	).textContent = _i( 'Target' );
	addClick( 'ButtonRefresh', _ => refreshGoal() );
	addClick( 'datapointRetry', _ => getDatapoints( currentGoal() ) );

	// Dealine Updater
	// TODO: Dynamically set Interval rate based on Deadline duration
	setInterval( updateDeadline, MS );
}
/**
 * Validates username, makes API request and displays cached goals
 */
function popupStorageCallback( items ) {
	if ( !UName || !token )
		return clearBodyAppendLink(
			_i( 'You need to enter your details in the options page ' ),
			'/options.html'
		);

	// TODO: else if (!last API req was too soon)
	var req = {};
		req.url = "goals";
		req.onSuccess = getGoals_onSuccess;
		req.onFail = _ => getGoals_onFail( 'Download has failed' );
		req.onOffline = _ => getGoals_onFail( 'No connection available' );

	xhrHandler( req );

	displayGoal();
	createGoalSelector( getShowable() );
}
/**
 * API goal endpoint handler
 */
function getGoals_onSuccess( response ) {
	if ( response.length === 0 )
		return clearBodyAppendLink( 'There are no goals available' ); // TODO: localisation

	processRawGoals( response, goalsObject );

	displayGoal();
	createGoalSelector( getShowable() );
}
/**
 * Notifies user of inabilty to contact API
 */
function getGoals_onFail( message ) {
	message = _i( message );

	var toDisplay = getShowable();

	if ( toDisplay.length === 0 )
		return clearBodyAppendLink(
			`${ message }, ${ _i( 'No Goals Available' ) }`,
			'/options.html'
		);

	log( `${ message }. ${ _i( 'Using offline data oly' ) }` );
}
/**
 * Populates DOM with goal specific information.
 * Also cancles any Refresh calls for current goal
 */
function displayGoal( key ) {
	currentGoalId = find_Default_Or_Newewst_Goal( key );

	var goal = currentGoal();
	var urlroot = `${ BEE_URL }${ UName }/${ goal.slug }`;
	var lastRoad = roadTransform( goal.fullroad[ goal.fullroad.length - 1 ] );

	var updated	= countdownUnits( goal.updated_at, 1 ).toString();
	var start	= `${ ISODate( goal.initday ) } - ${ goal.initval }`;
	var now		= `${ ISODate( goal.curday ) } - ${ goal.curval }`;
	var target	= `${ ISODate( lastRoad.time ) } - ${ lastRoad.goal }`;
	var targetCD= countdownUnits( lastRoad.time, 2 ).toString();

	// Load Image
	loadImageFromMemory( goal.id );
	imageLoader( goal );

	// Populate content
	byid( 'GoalLoc'			).textContent = goal.title;
	byid( 'limsum'			).textContent = goal.limsum;
	byid( 'LastUpdateDate'	).textContent = _i( 'LastUpdate', updated );
	byid( 'Info_Start'		).textContent = start;
	byid( 'Info_Now'		).textContent = now;
	byid( 'Info_Target'		).textContent = target;
	byid( 'Info_Countdown'	).textContent = targetCD;

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
	getDatapoints( goal );

	// Inform user / Log event
	log( _i( "Output Set", currentGoalId ) );
}
/**
 * Recursive function initally calling calling Refresh enpoint, then calling goal enpoint
 */
function refreshGoal( i ) {	// Refresh the current goals data
	var req = {};
	var goal = currentGoal();

	// no i arg => call refresh endpoint
	if ( !i ) {
		req.url = `goals/${ goal.slug }/refresh_graph`;
		req.onSuccess = refreshGoal_RefreshCall;
	}

	// Check for new data in goals endpoint
	else {
		req.url = `goals/${ goal.slug }`;
		req.onSuccess = res => refreshGoal_GoalGet( i, res );
	}

	xhrHandler( req );
}
/**
 * Handler for refresh call that on successful response watches for new data
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
/**
 * Handler looking for change in goal data enpoint.
 * Updating goal data and notifying user.
 * Or, Failing aftere too many requests
 */
function refreshGoal_GoalGet( i, goal ) {
	var nextDelay = delay( i );
	var nextI = i + 1;

	if ( goal.updated_at === currentGoal().updated_at ) {
		if ( i <= 6 )
			timeoutRefresh = setTimeout( _ => refreshGoal( nextI ), nextDelay );

		else
			log( _i( 'The goal seems not to have updated, aborting refresh' ) );
	}

	else
		replaceCurrentGoal(
			goal,
			_i( 'Graph Refreshed', i, currentGoal().updated_at )
		);
}
/**
 * Creates goal selector dropdown
 */
function createGoalSelector( toDisplay ) {
	if ( toDisplay.length < 1 )
		return;

	var target = byid( 'TheContent' );
		target.innerHTML = '';

	var frag = document.createDocumentFragment();

	for ( var goal of toDisplay )
		frag.appendChild( createGoalSelctorLink( goal ) );

	target.appendChild( frag );
}
/**
 * Creates indiviual element used to select goals
 */

function createGoalSelctorLink( goal ) {
	var a = document.createElement( 'a' );
		a.className = 'GoalIDBtn';
		a.textContent = goal.title;
		a.addEventListener( 'click', _ => displayGoal( goal.id ) );
		// TODO: Add an additonal goto link w/ each Selector

	return a;
}
/**
 * called by 1 second interval that upadates the deadline countdown
 */
function updateDeadline(){
	var goal = currentGoal();

	if ( !goal ) return;

	var losedate = goal.losedate;
	var cd = countdown( losedate, null, null, 2 );
	var daysleft = cd.days;
	var colour;
	var countdownDisplay = document.querySelector( ".CountdownDisplay" );

	byid( 'countdownValue' ).innerHTML = cd.toString();

	if ( new Date() > losedate )
		byid( 'countdownFailed' ).textContent = _i( 'Past Deadline!' );

	if		( daysleft  >  2 )	colour = "#39b44a";
	else if ( daysleft === 2 )	colour = "#325fac";
	else if ( daysleft === 1 )	colour = "#f7941d";
	else if ( daysleft === 0 )	colour = "#c92026";
	else if ( daysleft  <  0 )	colour = "#c92026";
	else 						colour = "purple";

	countdownDisplay.style.backgroundColor = colour;
}
/**
 * Loads image as string, to diplay to user and to store in local stoarage
 * ... raw images cannot be stored in storage areas
 */
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
/**
 * Loads image data from storage
 */
function loadImageFromMemory( key ) {
	log( _i( 'This graph was loaded from offline storage' ) );
	accessImageArray( _ => byid( 'graph-img' ).src = KeyedImageArray[ key ] );
}
/**
 * Wrapper for: ___chrome.storage.local.get___. That passes KeyedImageArray to callback
 */
function accessImageArray( cb ) {
	if ( KeyedImageArray )
		cb( KeyedImageArray );
	else
		chrome.storage.local.get(
			'KeyedImageArray',
			items => {
				KeyedImageArray = items.KeyedImageArray;

				if ( !KeyedImageArray )
					KeyedImageArray = {};

				cb( KeyedImageArray );
			}
		);
}
/**
 * Calls API endpoint for datapoints.
 * Inserts response into goal object,
 * saves data to storage
 * and defaults to displaying new data to user
 */
function getDatapoints( goal, dontDisplay ) {
	var display = !dontDisplay;
	var slug = goal.slug;

	var request = {};
		request.url = `goals/${ slug }/datapoints`;
		request.onSuccess = res => {
			goal.dataPoints = res;

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
/**
 * Populates DOM with datapoint information
 */
function displayDatapoints( goal, error ) {
	var points = goal.dataPoints;

	// Create datapoints list
	var iCap = points.length <= MAX_POINTS ? points.length : MAX_POINTS;
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
/* --- --- --- ---		Options Functions			--- --- --- --- */
/**
 * Initialisation function used for options
 */
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
/**
 * Listener function that call API to authenticate user details
 */
function saveOptions() {
	UName = document.getElementById( "username"	).value;
	token = document.getElementById( "token"	).value;

	// Authenticate the credentials are valid
	xhrHandler( {
		onSuccess: saveOptions_authSuccess,
		onFail: _ => log( _i( '404: Check details try again' ), 60 * MS ),
		onOffline: _ => log( 'Currently offline, You need to be onlie to save yur details' ), // TODO: localisation
	} );
}
/**
 * If saveOptions authentication is successful, save options and notify user
 */
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
			url: "goals",
			onSuccess: _ => console.log( response ),
			// onFail	: ItHasFailed,
			// onOffline: ItHasFailed
		} );
	// }
}
/**
 * Listener that changes which goal is displayed first
 */
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
/**
 * Creates a list
 */
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
/**
 * Creates a row in the list
 */
function makeListItem( goal ) {
	var slug = goal.slug;
	var id = goal.id;

	var item = document.createElement( 'li' );
		item.className = 'item';
		item.id = `${ slug }-item`;

	var pack = { slug, item };

	var title = makeListLink( 'title', `title`, goal.title, pack );
		title.href = `${ BEE_URL }${ UName }/${ slug }/`;
	var defa = makeListLink( 'default', `defaultBtn`, '-', pack );
	var hide = makeListLink( 'hide', `HideBtn`, goal.Notify, pack );
	var notify = makeListLink( 'notify', `NotifyBtn`, goal.Show, pack );

	addClick( defa, _ => changeDefaultKey( id ) );
	// addClick( hide, MakeGoalsArray );
	// addClick( notify, _ => NotifyHandle( i ) );

	return elementList[ id ] = { item, title, defa, hide, notify, };
}
/**
 * Creates singular element for use in list row
 */
function makeListLink( className, id, text, { slug, item } ) {
	var elem = document.createElement( 'a' );
		elem.className = className;
		elem.id = `${ slug }-${ id }`;
		elem.textContent = text;

	item.appendChild( elem );

	return elem;
}
/* --- --- --- ---		Developer Functions			--- --- --- --- */
/**
 * Used to assess extensions footprint
 */
function developerInfo() {
	chrome.storage.sync.getBytesInUse(
		[ 'username', 'token', 'KeyedData', 'keyOfDefault', ],
		value => logStorageInfo( value, chrome.storage.sync )
	);
	chrome.storage.local.getBytesInUse(
		[ 'KeyedImageArray', ],
		value => logStorageInfo( value, chrome.storage.local )
	);
}
function logStorageInfo( value, sa ) {
	console.log( 'Bytes in use in sync storage area : ' + value );
	console.log( `Which is ${ ( value / sa.QUOTA_BYTES ) * 100 }% of storage` );
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
