/* jshint loopfunc: true, sub: true */
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
	if ( !args || isFunc( args.onSuccess ) ) return false;
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
			log( name + LangObj().xhr.Status404 );
			if ( isFunc( args.onFail ) )
				args.onFail( xhr.response );
			xhr.abort();
			return;
		}

		log( name + LangObj().xhr.StateChangeInfo );
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
	return typeof fun === 'function';
}
function log( text, time ){	// informs user and logs event
	// Validation and housekeeping
	if ( !text ) return false;
	if ( !time ) time = 5000;
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
		time
	);
}
function ByID( item ) {				// Abstraction
	return document.getElementById( item );
}
function LinkBM( id, salt, slug ) { // Sets the href of a link
	// Validation and Houskeeping
	if ( !id ) return false;

	salt = salt ? salt : "";
	slug = slug ? slug : CurDat().slug;

	// Set Link
	document.getElementById( id ).href =
		`https://www.beeminder.com/${ UName }/${ slug }/${ salt }`;
}
function LangObj( key ) {
	var select = "en";
	if ( select ) return LocalLang[ select ];

	var LangList = [ "cy", "en-GB", "en", "fr" ];// keys(LocalLang);
	for ( var i = 0; i < navigator.languages.length; i++ ) {
		for ( var j = 0; j < LangList.length; j++ ) {
			if ( PrefLangArray[ i ] === LangList[ j ] ) {
				select = LangList[ j ].toLowerCase();
				break;
			}
		}
		if ( select ) break;
	}
}
function ISODate( date ) {				// Abstraction
	return ( new Date( date ) ).toISOString().substring( 0, 10 );
}
function InsStr( id, string ) { 	// Abstraction
	document.getElementById( id ).textContent = string;
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){			// Initialises Popup.html
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
				a.textContent = LangObj().Popup.NavToOptions;
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
			_ => log( LangObj().Popup.HandleDownload.DataSaved )
		);

		log( LangObj().Popup.HandleDownload.DataDownloaded );
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
						// TODO LangObj().Popup.NavToOptions; ^^^^
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

	// Load Image
	ImageLoader( CurDat().graph_url, CurDat().id );

	// Set content in:
	InsStr( "GoalLoc", CurDat().title );			// Menu
	LinkBM(	"ButtonGoal" 						);	// Menu
	LinkBM(	"GraphLink"							);	// Menu
	LinkBM(	"ButtonData",		"datapoints"	);	// Menu
	LinkBM(	"ButtonSettings",	"settings"		);	// Menu
	InsStr( "limsum", CurDat().limsum);				// Baremin

	// Stop the refresh recursion if it's set
	clearTimeout( RefreshTimeout );

	// Set the deadline colour TODO move to DisplayDeadline()
	document.querySelector( ".CountdownDisplay" ).style.backgroundColor = (
		_ => { // TODO: delegate to handler function
			var daysleft = new countdown( CurDat().losedate ).days;
			if		( daysleft  >  2 )	return "#39b44a";
			else if ( daysleft === 2 )	return "#325fac";
			else if ( daysleft === 1 )	return "#f7941d";
			else if ( daysleft === 0 )	return "#c92026";
			else if ( daysleft  <  0 )	return "#c92026";
			return "purple";
		}
	)( /**/ );

	// Set content in meta-data TODO: Something
	var LastRoad = CurDat().fullroad[CurDat().fullroad.length-1];
	InsStr("LastUpdateDate", LangObj().Popup.InfoDisplay.LastUpdate(
			( new countdown(CurDat().updated_at,null,null,1) ).toString()
	));
	InsStr("Info_Start", ISODate(CurDat().initday) +" - "+ CurDat().initval	);
	InsStr("Info_Now",	 ISODate(CurDat().curday)  +" - "+ CurDat().curval	);
	InsStr("Info_Target",ISODate(LastRoad[0]*1000) +" - "+ LastRoad[1]		);
	InsStr("Info_Countdown", countdown(LastRoad[0]*1000,null,null,2).toString());

	// Inform user / Log event
	log( LangObj().Popup.OutputSet + e );
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
function DataRefresh( i ){	// Refresh the current goals data
	if ( !i )
		xhrHandler( {
			url: `goals/${ CurDat().slug }/refresh_graph`,
			name: LangObj().Popup.Refresh.RefreshCall.Name,
			onSuccess: RefreshCall
		} );
	else
		xhrHandler( {
			url: `goals/${ CurDat().slug }`,
			name: LangObj().Popup.Refresh.GoalGet.Name,
			onSuccess: GoalGet
		} );

	function RefreshCall( response ) {
		if ( response === "true" ) {
			log( LangObj().Popup.Refresh.RefreshCall.UpdateSuccessful );
			RefreshTimeout = setTimeout( _ => DataRefresh( 1 ), 2500 );
		}
		else
			log( LangObj().Popup.Refresh.RefreshCall.UpdateNo );
	}
	function GoalGet( response ) {
		log( `iteration ${i}` );
		response = JSON.parse( response );
		// XXX: Untested changes, but sould work?
		if ( response.updated_at === CurDat().updated_at && i <= 6 ) {
			RefreshTimeout = setTimeout( _ => DataRefresh( i + 1 ), GrowingDelay( i ) );
			log( `${ LangObj().Popup.Refresh.GoalGet.NoUpdate }${ i } ${ GrowingDelay( i ) }` );
		}
		else if ( response.updated_at === CurDat().updated_at && i > 6 )
			log( LangObj().Popup.Refresh.GoalGet.TooManyTries );
		else {
			console.log( "Testing: What doesn this do? " + CurDat( null ) );
			CurDat( ReturnGoalElement( response ) );
			SetOutput();
			chrome.storage.sync.set(
				{ GoalsData: NeuGoalsArray },
				_ => log( LangObj().Popup.Refresh.GoalGet.NewDataSaved )
			);
			log( `${ LangObj().Popup.Refresh.GoalGet.GoalRefreshed }${ i } ${ CurDat().updated_at }` );
		}
	}
	function GrowingDelay( i ) {
		if ( !i ) return false;
		return 2500 * Math.pow( 2, ( i - 1 ) );
	}
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
	InsStr( "ButtonGoal",		LangObj().Popup.ButtonGoal		);
	InsStr( "ButtonRefresh",	LangObj().Popup.ButtonRefresh	);
	InsStr( "ButtonData",		LangObj().Popup.ButtonData		);
	InsStr( "ButtonSettings",	LangObj().Popup.ButtonSettings	);
	InsStr( "OptLink",			LangObj().Popup.OptLink			);
	document.getElementById( "ButtonRefresh" ).addEventListener(
		"click", _ => DataRefresh()
	);

	// Populates content is Countdown box
	var BoxCountdown = document.createDocumentFragment();
		BoxCountdown.appendChild( document.createTextNode( LangObj().Popup.Deadline ) );
		BoxCountdown.appendChild( document.createElement( "br" ) );
	var Span_dlout = BoxCountdown.appendChild( document.createElement( "span" ) );
		Span_dlout.id = "dlout";
	ByID( "Countdown" ).appendChild( BoxCountdown );

	// Sets Deadline Counter
	setInterval( DisplayDeadline, 1000 );

	// Populates content in BareMin Box
	var BoxBareMin = document.createDocumentFragment();
		BoxBareMin.appendChild( document.createTextNode( LangObj().Popup.BareMin ) );
		BoxBareMin.appendChild( document.createElement( "br" ) );
	var Span_limsum = BoxBareMin.appendChild( document.createElement( "span" ) );
		Span_limsum.id = "limsum";
	ByID( "BareMin" ).appendChild( BoxBareMin );

	// Populates meta-data
	InsStr( "Label_Start",	LangObj().Popup.InfoDisplay.Start	);
	InsStr( "Label_Now",	LangObj().Popup.InfoDisplay.Now		);
	InsStr( "Label_Target",	LangObj().Popup.InfoDisplay.Target	);

	// Load default goal
	SetOutput( DefGoal.Loc );

	function DisplayDeadline(){
		var string = new countdown(CurDat().losedate).toString();

		if	( new Date() > CurDat().losedate )
			string = LangObj().Popup.PastDeadline + string;

		ByID("dlout").innerHTML = string;
		// 	NOTE: Should really be an append, but because of BR it needs to be innerHTML
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
				console.log( LangObj().Popup.ImageHandler.NotAnError404 );
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
function OPTinit(){
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
				log( LangObj().Options.NoUserData );
			else if ( NeuGoalsArray.length >= 1 )
				drawList();
			else
				log( LangObj().Options.NoUserData );
		}
	);

	document.getElementById( "save" ).addEventListener(
		"click", save_options
	);
	document.getElementById( "clear" ).addEventListener(
		"click", _ => chrome.storage.sync.clear()
	);
}
function save_options() {
	UName = document.getElementById( "username"	).value;
	token = document.getElementById( "token"	).value;

	if	( !DefGoal )
		DefGoal = {Loc:0};

	// Authenticate the credentials are valid
	// TODO: offline handeler - if offline set conection listener
	xhrHandler( {
		name: LangObj().Options.save_options.xhrName,
		onSuccess: AuthYes,
		onFail: AuthNo
	} );

	function AuthYes( response ) { // func on credentials confirmed correct
		chrome.storage.sync.set(
			{
				username	:	UName,
				token		:	token,
				DefGoal		:	DefGoal
			},
			AuthYesNotify
		);
		// if (NeuGoalsArray.length === 0){
			xhrHandler( {
				name: "Handle Download",
				url: "goals",
				onSuccess: HandleResponse//,
				// onFail	: ItHasFailed,
				// onOffline: ItHasFailed
			} );
		// }
	}
	function AuthYesNotify() { // func to confrim options are saved
		InsStr( "status", LangObj().Options.save_options.OptionsSaved );
		setTimeout( _ => InsStr( "status", "" ), 2000 );
	}
	function HandleResponse( response ) // onSave GoalsGET handler placeholder
		{ console.log( JSON.parse( response ) ); }
	function AuthNo() { // func if credentials are not valid
		log(
			LangObj().Options.save_options.Message404,
			60000
		);
	}
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
	ElementsList[ DefGoal.Loc ].defa.textContent = LangObj().Options.Default;
}
function drawList(){
	for ( var i = 0; i < NeuGoalsArray.length; i++ ) {
		var elem = ElementsList[ i ];
		var elemGoals = NeuGoalsArray[ i ];

		elem = {
			"item"	: document.createElement( "li" ),	// List Item
			"title"	: document.createElement( "a"  ),	// Goal title
			"defa"	: document.createElement( "a"  ),	// Default selector
			"hide"	: document.createElement( "a"  ),	// Hide Toggle
			"notify": document.createElement( "a"  )	// Notification Toggle
		};

		elem.item	.className = "item";
		elem.title	.className = "title";
		elem.defa	.className = "default";
		elem.hide	.className = "hide";
		elem.notify	.className = "notify";

		elem.item	.id = elemGoals.slug + "-item";
		elem.title	.id = elemGoals.slug + "-title";
		elem.defa	.id = elemGoals.slug + "-defaultBtn";
		elem.hide	.id = elemGoals.slug + "-HideBtn";
		elem.notify	.id = elemGoals.slug + "-NotifyBtn";

		elem.title	.textContent = elemGoals.title;
		elem.defa	.textContent = "-";
		elem.hide	.textContent = elemGoals.Notify;
		elem.notify	.textContent = elemGoals.Show;

		ByID("TheList").appendChild( elem.item);
			elem.item.appendChild( elem.title );
			elem.item.appendChild( elem.defa );
			elem.item.appendChild( elem.hide );
			elem.item.appendChild( elem.notify );

		( function ( _i ) {
			LinkBM( ElementsList[ _i ].title.id, undefined, elemGoals.slug );
			ElementsList[ _i ].defa.addEventListener( "click", _ => DefaultHandle( _i ) );
			// ElementsList[ _i ].hide.addEventListener
			// 	( "click", MakeGoalsArray );
			// notify.addEventListener
			// 	( "click", functions(){ NotifyHandle( i ) } );
		} )( i );

		if	(elemGoals.slug === DefGoal.Name) {DefGoal.Loc = i;}
	}

	if ( Number.isInteger( DefGoal.Loc ) )
		ElementsList[ DefGoal.Loc ].defa.innerHTML = LangObj().Options.Default;

	else {
		DefGoal.Loc = 0;
		ElementsList[ 0 ].defa.innerHTML = LangObj().Options.Default;
	}
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
			frag.appendChild( document.createTextNode( `Array length : ${ response.length }` ) );
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
