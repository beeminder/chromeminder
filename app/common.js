/* jshint loopfunc: true, sub: true *//* Editing Prefs:
	Tab width: 4
	*/
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
function xhrHandler(args){
	if ( !args || !args.SuccessFunction ) { return false; }
	/* Arguments:
		SuccessFunction (response) or (response,ExtraVariabl)
							What to do when successful request has been made
		OfflineFunction ()	What to do when offline
		name			= string	to identify xhr
		url				= string	Salt for specific API calls
		FailFunction	()	What to do when a 404 has been given
		SuccessExtraVar = whatever needs to be passed back
	*/

	var name = IfSet( args.name, undefined, " - ");

	// Offline detection
	if 		( !navigator.onLine &&  args.OfflineFunction )
			{ args.OfflineFunction();					return false; }
	else if	( !navigator.onLine && !args.OfflineFunction )
			{ InfoUpdate( name + "Currently Offline" );	return false; }

	// HTTP request
	var xhr = new XMLHttpRequest();
		// xhr.onreadystatechange = StateChange;
		xhr.onload = LoadEvent;
		xhr.open( "GET",
			"https://www.beeminder.com/api/v1/users/" + UName +
			/**/ IfSet( args.url ) + ".json?auth_token=" + token
		);
		xhr.send();

	function LoadEvent() {
		if (xhr.status === 404) {
			InfoUpdate (name + LangObj().xhr.Status404);
			if ( args.FailFunction ){ args.FailFunction(); }
			xhr.abort();
		} else {
			InfoUpdate (name + LangObj().xhr.StateChangeInfo);
			if (xhr.status === 200 && xhr.readyState === 4){
				if		( !args.SuccessExtraVar )
						{ args.SuccessFunction(xhr.response); }
				else	{ args.SuccessFunction (
							xhr.response,
							args.SuccessExtraVar
				); }
			} //If Ready to access data
		} // If Access denied / allowed
	}
}
function IfSet ( input, bef, aft ){	// returns a string containg input if !nul
	if		( input || !bef || !aft )	{ return		input 		;}
	else if ( input ||  bef || !aft )	{ return bef +	input 		;}
	else if ( input || !bef ||  aft )	{ return		input + aft	;}
	else if ( input ||  bef ||  aft )	{ return bef +	input + aft	;}
	else								{ return		  ""		;}
}
function InfoUpdate ( text, time ){	// informs user and logs event
	// Validation and housekeeping
	if (!text)		{ return false; }
	if (!time)		{ time = 5000; }
	if (IUTimeout)	{ clearTimeout(IUTimeout); }

	// Displaying and logging message
	ByID("SeverStatus").textContent = text;
	console.log( text );

	// Timout to blank out display
	IUTimeout = setTimeout(
		function() {
			ByID("SeverStatus").textContent = "";
			IUTimeout = undefined;
		},
		time
	);
}
function ByID  ( item ){			// Abstraction
	return document.getElementById(item);
}
function LinkBM ( ElementId, URLSalt, Slug ) { // Sets the href of a link
	// Validation and Houskeeping
	if (!ElementId)	{ return false;					}
	if (!URLSalt)	{ URLSalt 	= "";				}
	if (!Slug)		{ Slug		= CurDat().slug;	}

	// Set Link
	document.getElementById(ElementId).href =
	"https://www.beeminder.com" + "/" + UName + "/" + Slug + "/" + URLSalt;
}
function LangObj() {
	var select = "en";
	// var LangList = ["cy", "en-GB", "en", "fr"];// keys(LocalLang);
	// for (var i = 0; i < navigator.languages.length; i++){
	// 	for (var x = 0; x < LangList.length; x++){
	// 		if (PrefLangArray[i] === LangList[x]) {
	// 			select = LangList[x].toLowerCase();
	// 			break;
	// 		}
	// 	}
	// 	if (select) { break; }
	// }
	return LocalLang[select];
}
function ISODate ( x ) {				// Abstraction
	return new Date(x).toISOString().substring(0, 10);
}
function InsStr ( element, string ) { 	// Abstraction
	document.getElementById(element).textContent = string;
}
function RKeysArray() {// XXX:
	return Object.keys(KeyedGoalsArray);
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){			// Initialises Popup.html
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: 	"",
			token		: 	"",
			DefGoal		:	{Loc:0},
			KeyedData	:	{},
			Lang		:	navigator.languages
		},
		Retrieval
	);
	document.getElementById("ButtonRefresh").addEventListener(
		"click", function(){DataRefresh();}
	);
	function Retrieval (items){
		if (!items) { return false; }

		UName			= items.username;
		token			= items.token;
		DefGoal			= items.DefGoal;
		PrefLangArray	= items.Lang;
		KeyedGoalsArray	= items.KeyedData;

		if (UName === "" || token === "") {
			var a = document.createElement('a');
			a.textContent = LangObj().Popup.NavToOptions;
			a.href = "/options.html";
			a.target = "_blank";
			document.body.innerHTML = "";
			document.body.appendChild(a);
		} else { // TODO else if (!last API req was too soon)
			( function(){HandleDownload();} )( /**/ );
		} //If Data is blank
	}
	function HandleDownload(){
		xhrHandler({
			name:"Handle Download",
			url:"/goals",
			SuccessFunction	: HandleResponse,
			FailFunction	: ItHasFailed,
			OfflineFunction	: ItHasFailed
		});

		function HandleResponse(response){
			var WorkingResponse = JSON.parse(response);
			var DefHolding, NoOfDefs, PastData, NeuData;

			NeuGoalsArray = []; // Clear Array TODO Implement merging script

			for (var i = 0; i < WorkingResponse.length; i++){
				NeuData = WorkingResponse[i];
				PastData = KeyedGoalsArray[NeuData.id];

				if (DefGoal.Name == WorkingResponse[i].slug){DefHolding = i;}
				NeuGoalsArray[i] = ReturnGoalElement(WorkingResponse[i]);

				if  (PastData) {// If data has already been exist

					// Nothing has changed, No need to do anything
					// if (NeuData.updated_at*1000 === PastData.updated_at){} else {
						KeyedGoalsArray[NeuData.id] = ReturnGoalElement(NeuData, PastData);
					// }
					if (PastData.Default) {
						DefHolding = NeuData.id;
						NoOfDefs ++;
					}
				} else { // If data doesn't exist
					KeyedGoalsArray[NeuData.id] = ReturnGoalElement(NeuData);
				}
			}

			if		(!DefHolding)	{ DefHolding = 0; }
			else if (NoOfDefs > 1)	{ DefHolding = 0; }
			someVar.ArrayNo = DefGoal.Loc = DefHolding;

			chrome.storage.sync.set(
				{
					GoalsData	: NeuGoalsArray,
					KeyedData	: KeyedGoalsArray,
					DefGoal		: DefGoal
				},
				function() {InfoUpdate(LangObj().Popup.HandleDownload.DataSaved);}
			);

			InfoUpdate (LangObj().Popup.HandleDownload.DataDownloaded);
			IniDisplay();
		}
		function ItHasFailed() {
			InfoUpdate("Download has failed, initalising from offline data");
			chrome.storage.sync.get(
				{ GoalsData	:	[] },
				function (items) {
					NeuGoalsArray = items.GoalsData;

					if (items.GoalsData.length >= 1){
						someVar.ArrayNo = DefGoal.Loc;
						IniDisplay();
					} else {
						var a = document.createElement('a');
						a.textContent = "No Goals Available";// TODO LangObj().Popup.NavToOptions;
						a.href = "/options.html";
						a.target = "_blank";
						document.body.innerHTML = "";
						document.body.appendChild(a);
					}

					var smallest = new Date();
					var index;
					for (var i = 0; i < NeuGoalsArray.length; i++){
						var hello = NeuGoalsArray[i].updated_at;
						if (smallest > hello){
							smallest = hello;
							index = i;
						}
					}

					var interogant = new countdown(smallest);
					console.log(interogant.toString());
				}
			);
		}
	}
}
function SetOutput(e){		// Displays Goal specific information
	// If e is not satisfied or valid, use the current goal
	if 		( typeof e === "string" ) // TODO: Need to validate the goal exists
			{ CurString = e;		}
	else if	( Number.isInteger(e) && e >= NeuGoalsArray.length		)
			{
				someVar.ArrayNo = e;
				CurString = NeuGoalsArray[e].id;
			}
	else	{ e = someVar.ArrayNo;	}

	// Load Image
	ImageLoader(CurDat().graph_url, CurDat().id);

	// Set content in:
	InsStr( "GoalLoc", CurDat().title);				// Menu
	LinkBM(	"ButtonGoal" 						);	// Menu
	LinkBM(	"GraphLink"							);	// Menu
	LinkBM(	"ButtonData",		"datapoints"	);	// Menu
	LinkBM(	"ButtonSettings",	"settings"		);	// Menu
	InsStr( "limsum", CurDat().limsum);				// Baremin

	// Stop the refresh recursion if it's set
	clearTimeout(RefreshTimeout);

	// Set the deadline colour TODO move to DisplayDeadline()
	document.querySelector(".CountdownDisplay").style.backgroundColor = (function(){
		var daysleft = new countdown(CurDat().losedate).days;
		if	   	(daysleft  >  2)	{return "#39b44a";}
		else if (daysleft === 2)	{return "#325fac";}
		else if (daysleft === 1)	{return "#f7941d";}
		else if (daysleft === 0)	{return "#c92026";}
		else if (daysleft  <  0)	{return "#c92026";}
		return "purple";
	})( /**/ );



	// Set content in meta-data
	var LastRoad = CurDat().fullroad[CurDat().fullroad.length-1];
	InsStr("LastUpdateDate", LangObj().Popup.InfoDisplay.LastUpdate(
			new countdown(CurDat().updated_at,null,null,1).toString()
	));
	InsStr("Info_Start", ISODate(CurDat().initday) +" - "+ CurDat().initval	);
	InsStr("Info_Now",	 ISODate(CurDat().curday)  +" - "+ CurDat().curval	);
	InsStr("Info_Target",ISODate(LastRoad[0]*1000) +" - "+ LastRoad[1]		);
	InsStr("Info_Countdown", countdown(LastRoad[0]*1000,null,null,2).toString());
	// Inform user / Log event
	InfoUpdate (LangObj().Popup.OutputSet + e);
}
function CurDat(NeuObj){	// Return object for the currently displayed goal or replace it
	// If NeuObj is
	if		( NeuObj && NeuGoalsArray[someVar.ArrayNo].id === NeuObj.id )
			{
				NeuGoalsArray[someVar.ArrayNo]	= NeuObj;
				KeyedGoalsArray[NeuObj.id]		= NeuObj;
			}

	// If NeuObj is true
	else if	( NeuObj && NeuGoalsArray[someVar.ArrayNo].id !== NeuObj.id )
			{ return false; }

	// If there is a goal key return a KeyedGoalsArray item
	else if ( CurString ) // TODO:
			{ return KeyedGoalsArray[CurString]; }

	// If CurString isn't set, set it
	else	{
				CurString = NeuGoalsArray[someVar.ArrayNo].id;
				return KeyedGoalsArray[CurString];
			}
}
function DataRefresh(i){	// Refresh the current goals data
	if		( !i ) { xhrHandler({
				url		: "/goals/" + CurDat().slug + "/refresh_graph",
				name	: LangObj().Popup.Refresh.RefreshCall.Name,
				SuccessFunction : RefreshCall
			});}
	else if	( i ) { xhrHandler({
				url		: "/goals/" + CurDat().slug,
				name	: LangObj().Popup.Refresh.GoalGet.Name,
				SuccessFunction : GoalGet
			});}

	function RefreshCall (response) {
		if		(response === "true" ) {
					InfoUpdate (LangObj().Popup.Refresh.RefreshCall.UpdateSuccessful);
					RefreshTimeout = setTimeout(function (){DataRefresh (1);},2500);
				}
		else if	( response !== "true" ) {
					InfoUpdate (LangObj().Popup.Refresh.RefreshCall.UpdateNo);
				} //If refresh true / !true
	}
	function GoalGet (response){
		InfoUpdate("iteration " + i);
		response = JSON.parse(response);
		if (response.updated_at === CurDat().updated_at){
			if (i<=6) {
				RefreshTimeout = setTimeout(function (){DataRefresh (i+1);}, GrowingDelay(i));
				InfoUpdate(LangObj().Popup.Refresh.GoalGet.NoUpdate +
				/**/											i + " " + GrowingDelay(i));
			} else {
				InfoUpdate(LangObj().Popup.Refresh.GoalGet.TooManyTries);
			}
		} else {
			CurDat(null);
			CurDat(ReturnGoalElement(response));
			SetOutput();
			chrome.storage.sync.set(
				{GoalsData:NeuGoalsArray},
				function() {InfoUpdate(LangObj().Popup.Refresh.GoalGet.NewDataSaved);}
			);
			InfoUpdate (LangObj().Popup.Refresh.GoalGet.GoalRefreshed + i + " " + CurDat().updated_at);
		}
	}
	function GrowingDelay(i){
		if (!i) { return false; }
		return 2500 * Math.pow(2,(i-1));
	}
}
function IniDisplay(){		// Initialise the display
	var frag, key; // TODO: No longer in use???

	// Goal Selector
	if (RKeysArray().length > 1) {
		frag = document.createDocumentFragment();
		for (var i = 0; i < NeuGoalsArray.length; i++){
			key = RKeysArray()[i];
			obj = KeyedGoalsArray[key];

			if (obj.Show === true){

				var a = frag.appendChild(document.createElement('a'));
				a.className = 'GoalIDBtn';
				a.id			= obj.slug;
				a.textContent	= obj.title;
				(function(_i) {a.addEventListener(
						"click",
						function() {SetOutput(_i);console.log(_i);}
				);})(obj.id);// TODO: Add an additonal goto link w/ each Selector
			}
		}
		ByID("TheContent").innerHTML = "";
		ByID("TheContent").appendChild(frag);
	}

	// Populates text and RefreshAction listener in Menu Box
	InsStr( "ButtonGoal",		LangObj().Popup.ButtonGoal		);
	InsStr( "ButtonRefresh",	LangObj().Popup.ButtonRefresh	);
	InsStr( "ButtonData",		LangObj().Popup.ButtonData		);
	InsStr( "ButtonSettings",	LangObj().Popup.ButtonSettings	);
	InsStr( "OptLink",			LangObj().Popup.OptLink			);
	document.getElementById("ButtonRefresh").addEventListener(
		"click", function(){DataRefresh();}
	);

	// Populates content is Countdown box
	var BoxCountdown = document.createDocumentFragment();
		BoxCountdown.appendChild(document.createTextNode(LangObj().Popup.Deadline));
		BoxCountdown.appendChild(document.createElement("br"));
	var Span_dlout = BoxCountdown.appendChild(document.createElement("span"));
		Span_dlout.id = "dlout";
	ByID("Countdown").appendChild(BoxCountdown);

	// Sets Deadline Counter
	setInterval(DisplayDeadline,1000);

	// Populates content in BareMin Box
	var BoxBareMin = document.createDocumentFragment();
		BoxBareMin.appendChild(document.createTextNode(LangObj().Popup.BareMin));
		BoxBareMin.appendChild(document.createElement("br"));
	var Span_limsum = BoxBareMin.appendChild(document.createElement("span"));
		Span_limsum.id = "limsum";
	ByID("BareMin").appendChild(BoxBareMin);

	// Populates meta-data
	InsStr( "Label_Start",	LangObj().Popup.InfoDisplay.Start	);
	InsStr( "Label_Now",	LangObj().Popup.InfoDisplay.Now		);
	InsStr( "Label_Target",	LangObj().Popup.InfoDisplay.Target	);

	// Load default goal
	SetOutput( DefGoal.Loc );

	function DisplayDeadline(){
		var string = new countdown(CurDat().losedate).toString();
		if	( new Date() > CurDat().losedate )
			{ string = LangObj().Popup.PastDeadline + string; }
		ByID("dlout").innerHTML = string;
		// 	NOTE: Should really be an append, but because of BR it needs to be innerHTML
	}
}
function ImageLoader(url, key){	// Loads the image as string
	// TODO insert into goal obj and save
	// TODO: Implement offline detection

	// URL Checking
	if (!url){return false;}
	if (url.substring(0,39).toLowerCase() != "https://bmndr.s3.amazonaws.com/uploads/") {
		InfoUpdate("Recieved invalid url: \n" + url); // TODO String Localisation []
		return false;
	}

	// Offline detection
	if (!navigator.onLine) {return false;}
	// IDEA: should more me done?
	//			on reconnect script
	//			timer
	//			custom callback

	var imgxhr = new XMLHttpRequest();
		imgxhr.open("GET",url  + "?" + new Date().getTime());
		imgxhr.responseType = "blob";
		imgxhr.onload = function (){
			if (imgxhr.status===200){
				reader.readAsDataURL(imgxhr.response);
			}
			else if (imgxhr.status===404){
				console.log(LangObj().Popup.ImageHandler.NotAnError404);
			}
		};
	var reader = new FileReader();
		reader.onloadend = function () {
			ByID("graph-img").src = reader.result;
			console.log(reader.result.length);

			if (typeof key === "string") {
				KeyedImageArray[key] = reader.result;
				chrome.storage.local.set({
					KeyedData	: KeyedGoalsArray
				});
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
			ByID( "username"	).value = username	= items.username;
			ByID( "token"		).value = token		= items.token;
			updated_at		= items.updated_at;
			DefGoal			= items.DefGoal;
			NeuGoalsArray	= items.GoalsData;
			if 		( items.username === "" || items.token === ""	)
					{ InfoUpdate( LangObj().Options.NoUserData );	}
			else if ( NeuGoalsArray.length >= 1						)
					{ drawList();									}
			else 	{ InfoUpdate( LangObj().Options.NoUserData );	}
		}
	);

	document.getElementById("save").addEventListener(
		"click", save_options
	);
	);
}
function save_options() {
	UName = document.getElementById( "username"	).value;
	token = document.getElementById( "token"	).value;

	if	( !DefGoal )
		{ DefGoal = {Loc:0}; }

	// Authenticate the credentials are valid
	// TODO: offline handeler - if offline set conection listener
	xhrHandler({
		name			: LangObj().Options.save_options.xhrName,
		SuccessFunction : AuthYes,
		FailFunction 	: AuthNo
	});

	function AuthYes (response){ // func on credentials confirmed correct
		chrome.storage.sync.set(
			{
				username	:	UName,
				token		:	token,
				DefGoal		:	DefGoal
			},
			AuthYesNotify
		);
		// if (NeuGoalsArray.length === 0){
			xhrHandler({
				name:"Handle Download",
				url:"/goals",
				SuccessFunction	: HandleResponse//,
				// FailFunction	: ItHasFailed,
				// OfflineFunction	: ItHasFailed
			});
		// }
	}
	function AuthYesNotify () { // func to confrim options are saved
		InsStr( "status", LangObj().Options.save_options.OptionsSaved );
		setTimeout(
			function(){InsStr("status","");},
			2000
		);
	}
	function HandleResponse(response) // onSave GoalsGET handler placeholder
		{ console.log(JSON.parse(response)); }
	function AuthNo (){ // func if credentials are not valid
		InfoUpdate (
			LangObj().Options.save_options.Message404,
			60000
		);
	}
}
function DefaultHandle (i) {
	ElementsList[DefGoal.Loc].defa.textContent	= "-";
	DefGoal.Loc									= i;
	DefGoal.Name								= NeuGoalsArray[i].slug;
	ElementsList[DefGoal.Loc].defa.textContent	= LangObj().Options.Default;
}
function drawList(){
	for (var i = 0; i < NeuGoalsArray.length; i++){
		ElementsList[i] = {
			"item"	: document.createElement( "li" ),	// List Item
			"title"	: document.createElement( "a"  ),	// Goal title
			"defa"	: document.createElement( "a"  ),	// Default selector
			"hide"	: document.createElement( "a"  ),	// Hide Toggle
			"notify": document.createElement( "a"  )	// Notification Toggle
		};

		ElementsList[i].item	.className = "item";
		ElementsList[i].title	.className = "title";
		ElementsList[i].defa	.className = "default";
		ElementsList[i].hide	.className = "hide";
		ElementsList[i].notify	.className = "notify";

		ElementsList[i].item	.id = NeuGoalsArray[i].slug + "-item";
		ElementsList[i].title	.id = NeuGoalsArray[i].slug + "-title";
		ElementsList[i].defa	.id = NeuGoalsArray[i].slug + "-defaultBtn";
		ElementsList[i].hide	.id = NeuGoalsArray[i].slug + "-HideBtn";
		ElementsList[i].notify	.id = NeuGoalsArray[i].slug + "-NotifyBtn";

		ElementsList[i].title	.textContent = NeuGoalsArray[i].title;
		ElementsList[i].defa	.textContent = "-";
		ElementsList[i].hide	.textContent = NeuGoalsArray[i].Notify;
		ElementsList[i].notify	.textContent = NeuGoalsArray[i].Show;

		ByID("TheList").appendChild( ElementsList[i].item);
			ElementsList[i].item.appendChild(ElementsList[i].title	);
			ElementsList[i].item.appendChild(ElementsList[i].defa	);
			ElementsList[i].item.appendChild(ElementsList[i].hide	);
			ElementsList[i].item.appendChild(ElementsList[i].notify	);

		(function(_i) {
			LinkBM(ElementsList[_i].title.id,undefined,NeuGoalsArray[i].slug);
			ElementsList[_i].defa.addEventListener
				( "click", function() {DefaultHandle(_i);});
			// ElementsList[_i].hide.addEventListener
			// 	( "click", MakeGoalsArray );
			// notify.addEventListener
			// 	( "click", functions(){ NotifyHandle(i) } );
		})(i);

		if	(NeuGoalsArray[i].slug === DefGoal.Name) {DefGoal.Loc = i;}
	}

	if 		( Number.isInteger(DefGoal.Loc) )
			{ ElementsList[DefGoal.Loc].defa.innerHTML = LangObj().Options.Default; }
	else 	{
				DefGoal.Loc = 0;
				ElementsList[0].defa.innerHTML = LangObj().Options.Default;
			}
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
function ReturnGoalElement (object, old) {
	// TODO: Implement a Default options set
	var DefaultArray = {
		Notify		: true,
		Show		: true
	};

			// If old parameter is not set return element with default settings
	if		( !old )
			{ old = DefaultArray;			console.log("No Old"); }
			// If old parameter references keyed data
	else if ( typeof old === "string" && KeyedGoalsArray[old] )
			{ old = KeyedGoalsArray[old];	console.log("String"); }
			// If old parameter is anexisitng object
	else if ( typeof old === "object" && old.Notify && old.Show )
			{ old = old;					console.log("Object"); }
	else	// If old parameter isn't valid goal data
			{ console.log("Sommin Gone Wrong");		 return false; }

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
	for (var Loc = 0; Loc < NeuGoalsArray.length; Loc++) {
		xhrHandler({
			name : "DownloadDatapoints - " + NeuGoalsArray[Loc].slug,
			// TODO String Localisation []
			url : "/goals/" + NeuGoalsArray[Loc].slug + "/datapoints",
			SuccessFunction : HandleDatapoints,
			SuccessExtraVar : { ArrayLoc : Loc },
			FailFunction : GracefulFail
		});
	}

	function HandleDatapoints ( response, QInfo ) {
		if ( !response || !QInfo ) { return false; } // argie validation

		// Convert response into object and place into variables
		NeuGoalsArray[QInfo.ArrayLoc].datapoints = response = JSON.parse(response);

		// Cap the number of items to be showed on screen
		var	iCap = 10;
		if	( response.length <= 10 )
			{ iCap = response.length; }

		// doc.frag constuction technique
		var frag = document.createDocumentFragment();
			// Poulate frag with Statisitics
			frag.appendChild(document.createTextNode(NeuGoalsArray[QInfo.ArrayLoc].title));
			frag.appendChild(document.createElement("BR"));
			frag.appendChild(document.createTextNode("Array length : " + response.length));
			frag.appendChild(document.createElement("BR"));

		// Populate frag with datapoints
		for (var i = 0; i < iCap; i++) {
			var span = frag.appendChild(document.createElement("span"));
				span.textContent = response[i].canonical;
			frag.appendChild(document.createElement("BR"));
		}

		// Insert frag into document
		ByID("data-points").appendChild(frag);

		// Testing
		console.log(response);
	}
	function GracefulFail () {
		// IDEA: could drop the use of fragment for this single element
		var frag = document.createDocumentFragment();
		var FailBtn = frag.appendChild(document.createElement("DIV"));
			FailBtn.className = "Button";
			FailBtn.appendChild(document.createTextNode("The Download has failed!"));
			FailBtn.appendChild(document.createElement("BR"));
			FailBtn.appendChild(document.createTextNode("Click here to try again!"));
			FailBtn.addEventListener("click", function(){ DownloadDatapoints(); });

		// Clear data-points element and append message
		ByID("data-points").innerHTML = "";
		ByID("data-points").appendChild(frag);
	}
}

