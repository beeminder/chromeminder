var
	IUTimeout = "empty",		// Info update timeout
	RefreshTimeout = "empty",	// Refresh Timeout
	UName,						// Username
	updated_at,					//
	token,						// API Token
	PrefLangArray,				//
	CurString,					// The KeyedGoalsArray key of current goal
	ElementsList = [],			//
	NeuGoalsArray = [],			// Simple goals data array
	someVar = {// TODO Depreciate someVar
		updated_at	: "",
		ArrayNo		: ""
	},
	DefGoal = {
		Loc			: undefined,
		Name		: ""
	},
	RefreshTimeout = "empty",	//

	KeyedGoalsArray = {},		// Goals array using IDs as key
	KeyedImageArray = {},		//
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
	if ( IUTimeout ) clearTimeout( IUTimeout );

	// Displaying and logging message
	ByID( "SeverStatus" ).textContent = text;
	console.log( text );

	// Timout to blank out display
	IUTimeout = setTimeout(
		_ => {
			ByID( "SeverStatus" ).textContent = "";
			IUTimeout = undefined;
		},
		time ? time : 5000
	);
}
/* --- --- --- ---		Helper Functions			--- --- --- --- */
function ByID( item ) {
	return document.getElementById( item );
}
function LinkBM( id, salt, slug ) {
	// Validation and Houskeeping
	if ( !id ) return false;

	salt = salt ? salt : "";
	slug = slug ? slug : CurDat().slug;

	// Set Link
	document.getElementById( id ).href =
		`https://www.beeminder.com/${ UName }/${ slug }/${ salt }`;
}
function ISODate( date ) {
	return ( new Date( date ) ).toISOString().substring( 0, 10 );
}
function InsStr( id, string ) {
	document.getElementById( id ).textContent = string;
}
function insertString_i( id, string, ...args ) {
	document.getElementById( id ).textContent = _i( string, ...args );
}
function addClick( elem, func ) {
	return elem.addEventListener( 'click', func );
}
function setCountdownColour() {
	var colour = convertDeadlineToColour( CurDat().losedate );
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
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function initialisePopup(){			// Initialises Popup.html
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: "",
			token		: "",
			DefGoal		: { Loc: 0 },
			KeyedData	: {},
			Lang		: navigator.languages
		},
		Retrieval
	);

	function Retrieval( items ) {
		if ( !items ) return false;

		// IDEA: Make a UData object to handle user data instead of multiple variables
		UName			= items.username;
		token			= items.token;
		DefGoal			= items.DefGoal;
		PrefLangArray	= items.Lang;
		KeyedGoalsArray	= items.KeyedData;

		if ( !UName || !token ) { // TODO: Make this interface look better
			var a = document.createElement( 'a' );
				a.textContent = _i( 'You need to enter your details in the options page ' );
				a.href = "/options.html";
				a.target = "_blank";
				a.id = "NoCredsLink";

			document.body.innerHTML = "";
			document.body.appendChild(a);
		}

		else // TODO else if (!last API req was too soon)
			xhrHandler( {
				name: "Handle Download",
				url: "goals",
				onSuccess: HandleResponse,
				onFail: ItHasFailed,
				onOffline: ItHasFailed
			} );
	}

	function HandleResponse( response ) {
		var WorkingResponse = JSON.parse( response ),
			DefHolding = 0,
			NoOfDefs, PastData, NeuData;

		NeuGoalsArray = []; // Clear Array
		// NOTE: This isn't needed here as no data has been added

		for (var i = 0; i < WorkingResponse.length; i++){
			NeuData = WorkingResponse[ i ];
			PastData = KeyedGoalsArray[ NeuData.id ];

			if ( DefGoal.Name == WorkingResponse[ i ].slug ) DefHolding = i;

			NeuGoalsArray[ i ] = ReturnGoalElement( WorkingResponse[ i ] );

			if ( PastData ) {
				// If data has already been exist
				// Nothing has changed, No need to do anything
				// if ( NeuData.updated_at * 1000 === PastData.updated_at ) { } else {
				KeyedGoalsArray[ NeuData.id ]
					= ReturnGoalElement( NeuData, PastData );
				// }
				if ( PastData.Default ) {
					DefHolding = NeuData.id;
					NoOfDefs++;
				}
			}
			else
				KeyedGoalsArray[NeuData.id] = ReturnGoalElement(NeuData);
		}

		if ( NoOfDefs > 1 ) DefHolding = 0;
		someVar.ArrayNo = DefGoal.Loc = DefHolding;

		// Store newly constructed data
		chrome.storage.sync.set(
			{
				GoalsData	: NeuGoalsArray,
				KeyedData	: KeyedGoalsArray,
				DefGoal		: DefGoal
			},
			_ => log( _i( "Data has been downloaded" ) )
		);

		log( _i( "Goal data has been saved" ) );
		IniDisplay();
	}
	function ItHasFailed() {
		log( "Download has failed, initalising from offline data" );
		chrome.storage.sync.get(
			{ GoalsData	:	[] },
			function ( items ) {
				NeuGoalsArray = items.GoalsData;

				if ( items.GoalsData.length >= 1 ) {// If there is at least one goal
					someVar.ArrayNo = DefGoal.Loc;
					IniDisplay();
				}
				else {// If there is no goal data
					var a = document.createElement( "a" );
						a.textContent = "No Goals Available";
						// TODO lang( "You need to enter your details in the options page " ); ^^^^
						a.href = "/options.html";
						a.target = "_blank";

					document.body.innerHTML = "";
					document.body.appendChild( a );
				}
			}
		);
	}
}
function SetOutput( e ) {		// Displays Goal specific information
	// If e is not satisfied or valid, use the current goal
	if ( typeof e === "string" ) // TODO: Need to validate the goal exists
		CurString = e;
	else if ( Number.isInteger( e ) && e >= NeuGoalsArray.length ) {
		someVar.ArrayNo = e;
		CurString = NeuGoalsArray[ e ].id;
	}
	else
		e = someVar.ArrayNo;

	var goal = CurDat();

	// Load Image
	ImageLoader( goal.graph_url, goal.id );

	// Set content in:
	InsStr( "GoalLoc", goal.title );			// Menu
	LinkBM(	"ButtonGoal" 						);	// Menu
	LinkBM(	"GraphLink"							);	// Menu
	LinkBM(	"ButtonData",		"datapoints"	);	// Menu
	LinkBM(	"ButtonSettings",	"settings"		);	// Menu
	InsStr( "limsum", goal.limsum);				// Baremin

	// Stop the refresh recursion if it's set
	clearTimeout( RefreshTimeout );

	// Set the deadline colour TODO move to DisplayDeadline()
	setCountdownColour();
	setMetaData( goal );

	// Inform user / Log event
	log( _i( "Output Set", e ) );
}
function setMetaData( goal ) {
	var lastRoad = goal.fullroad[ goal.fullroad.length - 1 ];

	var updated = countdown( goal.updated_at, null, null, 1 ).toString();
	var start = `${ ISODate( goal.initday ) } - ${ goal.initval }`;
	var now = `${ ISODate( goal.curday ) } - ${ goal.curval }`;
	var target = `${ ISODate( lastRoad[ 0 ] * 1000 ) } - ${ lastRoad[ 1 ] }`;
	var targetCD = countdown( lastRoad[ 0 ] * 1000, null, null, 2 ).toString();

	insertString_i( 'LastUpdateDate', 'LastUpdate', updated );
	InsStr( "Info_Start", start );
	InsStr( "Info_Now", now );
	InsStr( "Info_Target", target );
	InsStr( "Info_Countdown", targetCD );

}
function CurDat( NeuObj ) {	// Return object for the currently displayed goal or replace it
	// If NeuObj is
	if ( NeuObj && NeuGoalsArray[ someVar.ArrayNo ].id === NeuObj.id ) {
		NeuGoalsArray[ someVar.ArrayNo ] = NeuObj;
		KeyedGoalsArray[ NeuObj.id ] = NeuObj;
	}

	// If NeuObj is true
	else if ( NeuObj && NeuGoalsArray[ someVar.ArrayNo ].id !== NeuObj.id )
		return false;

	// If there is a goal key return a KeyedGoalsArray item
	// TODO:
	else if ( CurString )
		return KeyedGoalsArray[ CurString ];

	// If CurString isn't set, set it
	else {
		CurString = NeuGoalsArray[ someVar.ArrayNo ].id;
		return KeyedGoalsArray[ CurString ];
	}
}
function DataRefresh( i ) {	// Refresh the current goals data
	var req = {};

	// no i arg => call refresh endpoint
	if ( !i ) {
		req.url = `goals/${ CurDat().slug }/refresh_graph`;
		req.name = _i( 'Refresh ' );
		req.onSuccess = DataRefresh_RefreshCall;
	}

	// Check for new data in goals endpoint
	else {
		req.url = `goals/${ CurDat().slug }`;
		req.name = _i( 'Refresh - Goal Update' );
		req.onSuccess = DataRefresh_GoalGet.bind( null, i );
	}

	xhrHandler( req );
}
function DataRefresh_RefreshCall( response ) {
	if ( response === "true" ) {
		log( _i( 'Waiting for Graph to refresh' ) );
		RefreshTimeout = setTimeout( _ => DataRefresh( 1 ), 2500 );
	}
	else
		log( _i( 'Beeminder Sever Says no' ) );
}
function DataRefresh_GoalGet( i, response ) {
	log( `iteration ${ i }` );
	response = JSON.parse( response );

	if ( response.updated_at === CurDat().updated_at && i <= 6 ) {
		RefreshTimeout = setTimeout(
			_ => DataRefresh( i + 1 ),
			delay( i )
		);

		log( _i( 'No Update', i, delay( i ) ) );
	}

	else if ( response.updated_at === CurDat().updated_at && i > 6 )
		log( _i( 'The goal seems not to have updated, aborting refresh' ) );

	else {
		console.log( `Testing: What doesn't this do? ${ CurDat( null ) }` );
		CurDat( ReturnGoalElement( response ) );
		SetOutput();

		chrome.storage.sync.set(
			{ GoalsData: NeuGoalsArray },
			_ => log( _i( 'New goal data has been saved' ) )
		);
		log( _i( 'Graph Refreshed', i, CurDat().updated_at ) );
	}
}
function delay( i ) {
	if ( !i ) return false;
	return 2500 * Math.pow( 2, ( i - 1 ) );
}
function IniDisplay(){		// Initialise the display
	var frag, key; // TODO: No longer in use???

	// Goal Selector
	var keys = Object.keys( KeyedGoalsArray );
	if ( keys.length > 1 ) {
		frag = document.createDocumentFragment();

		for ( var i = 0; i < NeuGoalsArray.length; i++ ) {
			key = keys[ i ];
			var obj = KeyedGoalsArray[ key ];

			if ( obj.Show === true ) {
				var a = frag.appendChild( document.createElement( 'a' ) );
					a.className = 'GoalIDBtn';
					a.id = obj.slug;
					a.textContent = obj.title;

				( function ( _i ) {
					a.addEventListener( "click", _ => SetOutput( _i ) );
				} )( obj.id );// TODO: Add an additonal goto link w/ each Selector
			}
		}

		ByID( "TheContent" ).innerHTML = "";
		ByID( "TheContent" ).appendChild( frag );
	}

	// Populates text and RefreshAction listener in Menu Box
	insertString_i( 'ButtonGoal',		'GOTO'		);
	insertString_i( 'ButtonRefresh',	'Refresh'	);
	insertString_i( 'ButtonData',		'Data'		);
	insertString_i( 'ButtonSettings',	'Settings'	);
	insertString_i( 'OptLink',			'Options'	);
	document.getElementById( "ButtonRefresh" ).addEventListener(
		"click", _ => DataRefresh()
	);

	// Populates content is Countdown box
	var BoxCountdown = document.createDocumentFragment();
		BoxCountdown.appendChild( document.createTextNode( _i( 'Deadline' ) ) );
		BoxCountdown.appendChild( document.createElement( "br" ) );
	var Span_dlout = BoxCountdown.appendChild( document.createElement( "span" ) );
		Span_dlout.id = "dlout";
	ByID( "Countdown" ).appendChild( BoxCountdown );

	// Sets Deadline Counter
	setInterval( DisplayDeadline, 1000 );

	// Populates content in BareMin Box
	var BoxBareMin = document.createDocumentFragment();
		BoxBareMin.appendChild( document.createTextNode( _i( 'Deadline' ) ) );
		BoxBareMin.appendChild( document.createElement( "br" ) );
	var Span_limsum = BoxBareMin.appendChild( document.createElement( "span" ) );
		Span_limsum.id = "limsum";
	ByID( "BareMin" ).appendChild( BoxBareMin );

	// Populates meta-data
	insertString_i( 'Label_Start',	'Now'	);
	insertString_i( 'Label_Now',	'Start'	);
	insertString_i( 'Label_Target',	'Target');

	// Load default goal
	SetOutput( DefGoal.Loc );

	function DisplayDeadline(){
		var string = new countdown(CurDat().losedate).toString();

		if	( new Date() > CurDat().losedate )
			string = `${ _i( 'Past Deadline!' ) }</br>${ string }`;

		ByID( "dlout" ).innerHTML = string;
		// 	NOTE: Should really be an append, but because of BR it needs to be innerHTML

		setCountdownColour();
	}
}
function ImageLoader( url, key ) {	// Loads the image as string
	// TODO insert into goal obj and save
	// TODO: Implement offline detection

	// URL Checking
	if (
		typeof url !== 'string' ||
		url.indexOf( "https://bmndr.s3.amazonaws.com/uploads/" ) !== 0
	) return log( `Recieved invalid url: \n${ url }` ); // TODO String Localisation []

	// Offline detection
	if ( !navigator.onLine ) return false;
	// IDEA: should more me done?
	//			on reconnect script
	//			timer
	//			custom callback

	var imgxhr = new XMLHttpRequest();
		imgxhr.open( "GET", url + "?" + new Date().getTime() );
		imgxhr.responseType = "blob";
		imgxhr.onload = function () {
			if ( imgxhr.status === 200 )
				reader.readAsDataURL( imgxhr.response );
			else if ( imgxhr.status === 404 )
				console.log( _i( '404 expected' ) );
		};
	var reader = new FileReader();
		reader.onloadend = function () {
			ByID( "graph-img" ).src = reader.result;
			console.log( reader.result.length );

			if ( typeof key === "string" ) {
				KeyedImageArray[ key ] = reader.result;
				chrome.storage.local.set( { KeyedData: KeyedGoalsArray } );
			}
		};

	imgxhr.send();
}
/* --- --- --- ---		Options Functions			--- --- --- --- */
function initialiseOptions(){
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			updated_at	:	"",
			DefGoal 	:	"",
			GoalsData	:	[]
		},
		function(items) {
			ByID( "username"	).value = UName = items.username;
			ByID( "token"		).value = token = items.token;
			updated_at		= items.updated_at;
			DefGoal			= items.DefGoal;
			NeuGoalsArray	= items.GoalsData;

			if ( items.username === "" || items.token === "" )
				log( _i( 'There be no data' ) );
			else if ( NeuGoalsArray.length >= 1 )
				drawList();
			else
				log( _i( 'There be no data' ) );
		}
	);

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

	if ( !DefGoal )
		DefGoal = { Loc: 0 };

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
			DefGoal		:	DefGoal
		},
		_ => {
			insertString_i( 'status', 'Options saved.' );
			setTimeout( _ => InsStr( "status", "" ), 2000 );
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
function ClearData () {
	//
	chrome.storage.sync.clear();

	// document.getElementById( "username"	).value = "";
	// document.getElementById( "token"	).value = "";
	// ^^^^ commented out for development reasons
}
function DefaultHandle( i ) {
	ElementsList[ DefGoal.Loc ].defa.textContent = "-";
	DefGoal.Loc = i;
	DefGoal.Name = NeuGoalsArray[ i ].slug;
	ElementsList[ DefGoal.Loc ].defa.textContent = _i( 'Default' );
}
function drawList() {
	var frag = document.createDocumentFragment();

	for ( var i = 0; i < NeuGoalsArray.length; i++ ) {
		var listItem = makeListItem( i );

		frag.appendChild( listItem.item );
	}

	ByID( 'TheList' ).appendChild( frag );

	if ( Number.isInteger( DefGoal.Loc ) )
		ElementsList[ DefGoal.Loc ].default.innerHTML = _i( 'Default' );

	else {
		DefGoal.Loc = 0;
		ElementsList[ 0 ].default.innerHTML = _i( 'Default' );
	}
}
function makeListItem( i ) {
	var goal = NeuGoalsArray[ i ];
	var slug = goal.slug;

	var item = document.createElement( 'li' );
		item.className = 'item';
		item.id = `${ slug }-item`;

	var pack = { slug, item };

	var title = makeListLink( 'title', `title`, goal.title, pack );
		title.href = `https://www.beeminder.com/${ UName }/${ slug }/`;
	var defa = makeListLink( 'default', `defaultBtn`, '-', pack );
	var hide = makeListLink( 'hide', `HideBtn`, goal.Notify, pack );
	var notify = makeListLink( 'notify', `NotifyBtn`, goal.Show, pack );

	addClick( defa, _ => DefaultHandle( i ) );
	// addClick( hide, MakeGoalsArray );
	// addClick( notify, _ => NotifyHandle( i ) );

	if ( goal.slug === DefGoal.Name ) DefGoal.Loc = i;

	return ElementsList[ i ] = { item, title, defa, hide, notify, };
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
function ReturnGoalElement( object, old ) {
	// TODO: Implement a Default options set
	var DefaultArray = {
		Notify		: true,
		Show		: true
	};

	// If old parameter is not set return element with default settings
	if ( !old ) {
		old = DefaultArray;
		console.log( "No Old" );
	}
	// If old parameter references keyed data
	else if ( typeof old === "string" && KeyedGoalsArray[ old ] ) {
		old = KeyedGoalsArray[ old ];
		console.log( "String" );
	}
	// If old parameter is anexisitng object
	else if ( typeof old === "object" && old.Notify && old.Show ) {
		old = old;
		console.log( "Object" );
	}
	// If old parameter isn't valid goal data
	else
		return console.log( "Sommin Gone Wrong" );

	// Return object with local settings added and dates formated into UNIX integer
	return {
		"slug"			: object.slug,
		"title"			: object.title,
		"description"	: object.description,
		"id"			: object.id,
		"losedate"		: object.losedate	*1000,	// Date
		"limsum"		: object.limsum,
		"DataPoints"	: [],
		"updated_at"	: object.updated_at	*1000,	// Date
		"initday"		: object.initday	*1000,	// Date
		"initval"		: object.initval,
		"curday"		: object.curday		*1000,	// Date
		"curval"		: object.curval,
		"lastday"		: object.lastday	*1000,	// Date
		"fullroad"		: object.fullroad,
		"graph_url"		: object.graph_url,
		"thumb_url"		: object.thumb_url,
		"Notify"		:	old.Notify,
		"Show"			:	old.Show,
		"autodata"		: object.autodata
	};
}
function DownloadDatapoints (){
	ByID("data-points").innerHTML = "";

	// API requsest for all datapoints
	for ( var Loc = 0; Loc < NeuGoalsArray.length; Loc++ ) {
		var slug = NeuGoalsArray[ Loc ].slug;

		xhrHandler( {
			name: `DownloadDatapoints - ${ slug }`,
			// TODO String Localisation []
			url: `goals/${ slug }/datapoints`,
			onSuccess: success.bind( null, { ArrayLoc: Loc } ),
			onFail: fail
		} );
	}

	function success( QInfo, response ) {
		if ( !response || !QInfo )
			return false;

		var goalData = NeuGoalsArray[ QInfo.ArrayLoc ];

		// Convert response into object and place into variables
		response = goalData.datapoints = JSON.parse( response );

		// Poulate frag with Statisitics
		var frag = document.createDocumentFragment();
			frag.appendChild( document.createTextNode( goalData.title ) );
			frag.appendChild( document.createElement( "br" ) );
			frag.appendChild( document.createTextNode( `Number of Datapoints : ${ response.length }` ) );
			frag.appendChild( document.createElement( "br" ) );

		// Populate frag with datapoints
		var	iCap = response.length <= 10 ? response.length : 10;
		for ( var i = 0; i < iCap; i++ ) {
			var span = frag.appendChild( document.createElement( "span" ) );
				span.textContent = response[ i ].canonical;

			frag.appendChild( document.createElement( "br" ) );
		}

		// Insert frag into document
		ByID( "data-points" ).appendChild( frag );
	}

	function fail() {
		var FailBtn = document.createElement( "DIV" );
			FailBtn.className = "Button";
			FailBtn.appendChild( document.createTextNode( "The Download has failed!" ) );
			FailBtn.appendChild( document.createElement( "BR" ) );
			FailBtn.appendChild( document.createTextNode( "Click here to try again!" ) );
			FailBtn.addEventListener( "click", _ => DownloadDatapoints() );

		// Clear data-points element and append message
		ByID( "data-points" ).innerHTML = "";
		ByID( "data-points" ).appendChild( FailBtn );
	}
}
