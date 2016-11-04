/* jshint loopfunc: true, sub: true */
var ServerStatusTimer = "empty", RefreshTimeout = "empty";
var UName, updated_at, token, PrefLangArray, CurString;
var ElementsList = [], NeuGoalsArray = [];
var someVar = {updated_at:"",ArrayNo:""};// TODO Depreciate someVar
var DefGoal = {Loc:undefined, Name:""};
var RefreshTimeout = "empty";

var KeyedGoalsArray = {}, KeyedImageArray = {};

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	if ( !args || !args.SuccessFunction ) { return false; }
	/* Arguments:
	*	SuccessFunction (response) or (response,ExtraVariabl)
							What to do when successful request has been made
		OfflineFunction ()	What to do when offline
		name			= string	to identify xhr
		url				= string	Salt for specific API calls
		FailFunction	()	What to do when a 404 has been given
		SuccessExtraVar = whatever needs to be passed back
	*/

	var xhr, name;
	name = IfSet(args.name,undefined," ");

	// Offline detection
	if (!navigator.onLine) {
		if (args.OfflineFunction) {args.OfflineFunction();}
		else 			{InfoUpdate(name + "Currently Offline");}
		return false;
	}

	// HTTP request
	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			InfoUpdate (name + LangObj().xhr.Status404);
			if (args.FailFunction){args.FailFunction();}
			xhr.abort();
		} else {
			InfoUpdate (name + LangObj().xhr.StateChangeInfo +
				xhr.status + " / " + xhr.statusText + " / " + xhr.readyState
			);
			if (xhr.status === 200 && xhr.readyState === 4){
				if (!args.SuccessExtraVar){args.SuccessFunction(xhr.response);}
				else {args.SuccessFunction(xhr.response, args.SuccessExtraVar);}
			} //If Ready to access data
		} // If Access denied / allowed
	}; // func xhr readyState

	xhr.open(
		"GET",
		"https://www.beeminder.com/api/v1/users/" + UName +
		/**/ IfSet(args.url) + ".json?auth_token=" + token
	);
	xhr.send();
}
function IfSet(input, bef, aft){	// returns a string containg input if !null
	var string;

	if (input)		{
						string = 		input;
		if (bef) 	{	string =  bef +	string			;}
		if (aft) 	{	string =		string + aft	;}
	}
	else 			{	string = ""						;}

	return string;
}
function InfoUpdate (text, time){	// informs user and logs event
	var SeverStatus = document.getElementById("SeverStatus");

	if (!text) { return false; }
	if (!time) { time = 5000; }
	if (ServerStatusTimer !== "empty"){ clearTimeout(ServerStatusTimer); }

	SeverStatus.textContent = text;
	console.log(text);
	ServerStatusTimer = setTimeout(
		function() {
			SeverStatus.textContent = '';
			ServerStatusTimer="empty";
		},
		time
	);
}
function ByID (item){				// Abstraction
	// for document.getElementById(item)
	return document.getElementById(item);
}
function LinkBM(ElementId, URLSalt, Slug) { // Sets the href of a link
	if (!ElementId)	{ return false;			}
	if (!URLSalt)	{ URLSalt = "";			}
	if (!Slug)		{ Slug = CurDat().slug;	}
	document.getElementById(ElementId).href=
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
function ISODate(x) { 				// Abstraction
	// for new Date(x).toISOString().substring(0, 10)
	return new Date(x).toISOString().substring(0, 10);
}
function InsStr(element,string){ 	// Abstraction
	// for document.getElementById(element).textContent = string
	ByID(element).textContent = string;
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
	if 		( typeof e === "string" )
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
	InsStr("GoalLoc", CurDat().title);				// Menu
	LinkBM(	"ButtonGoal" 						);	// Menu
	LinkBM(	"GraphLink"							);	// Menu
	LinkBM(	"ButtonData",		"datapoints"	);	// Menu
	LinkBM(	"ButtonSettings",	"settings"		);	// Menu
	InsStr("limsum", CurDat().limsum);				// Baremin

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
	if		(NeuObj && NeuGoalsArray[someVar.ArrayNo].id === NeuObj.id)
			{
				NeuGoalsArray[someVar.ArrayNo] = NeuObj;
				KeyedGoalsArray[NeuObj.id];
			}
	else if (CurString)
			{return KeyedGoalsArray[CurString];}
	else
			{
				CurString = NeuGoalsArray[someVar.ArrayNo].id;
				return NeuGoalsArray[someVar.ArrayNo];
			}
}
function DataRefresh(i){	// Refresh the current goals data
	if (!i){xhrHandler({
		url:"/goals/" + CurDat().slug + "/refresh_graph",
		name:LangObj().Popup.Refresh.RefreshCall.Name,
		SuccessFunction : RefreshCall
	});}
	else if (i) {xhrHandler({
		url:"/goals/" + CurDat().slug,
		name:LangObj().Popup.Refresh.GoalGet.Name,
		SuccessFunction: GoalGet
	});}

	function RefreshCall (response) {
		if (response === "true"){
			InfoUpdate (LangObj().Popup.Refresh.RefreshCall.UpdateSuccessful);
			RefreshTimeout = setTimeout(function (){DataRefresh (1);},2500);
		} else if (response !== "true") {
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
	var frag, BoxCountdown, Span_dlout, BoxBareMin, Span_limsum;

	// Goal Selector
	if (NeuGoalsArray.length > 1) {
		frag = document.createDocumentFragment();
		for (var i = 0; i < NeuGoalsArray.length; i++){
			if (NeuGoalsArray[i].Show === true){

				var a = frag.appendChild(document.createElement('a'));
				a.className = 'GoalIDBtn';
				a.id			= NeuGoalsArray[i].slug;
				a.textContent	= NeuGoalsArray[i].title;
				(function(_i) {a.addEventListener(
						"click",
						function() {SetOutput(_i);}
				);})(i);// TODO: Add an additonal goto link w/ each Selector
			}
		}
		ByID("TheContent").innerHTML = "";
		ByID("TheContent").appendChild(frag);
	}

	// Populates text in Menu Box
	InsStr( "ButtonGoal", LangObj().Popup.ButtonGoal);
	InsStr( "ButtonRefresh", LangObj().Popup.ButtonRefresh);
	InsStr( "ButtonData", LangObj().Popup.ButtonData);
	InsStr( "ButtonSettings", LangObj().Popup.ButtonSettings);
	InsStr( "OptLink", LangObj().Popup.OptLink);

	// Populates content is Countdown box
	BoxCountdown = document.createDocumentFragment();
	BoxCountdown.appendChild(document.createTextNode(LangObj().Popup.Deadline));
	BoxCountdown.appendChild(document.createElement("br"));
	Span_dlout = BoxCountdown.appendChild(document.createElement("span"));
	Span_dlout.id = "dlout";
	ByID("Countdown").appendChild(BoxCountdown);

	// Sets Deadline Counter
	setInterval(DisplayDeadline,1000);

	// Populates content in BareMin Box
	BoxBareMin = document.createDocumentFragment();
	BoxBareMin.appendChild(document.createTextNode(LangObj().Popup.BareMin));
	BoxBareMin.appendChild(document.createElement("br"));
	Span_limsum = BoxBareMin.appendChild(document.createElement("span"));
	Span_limsum.id = "limsum";
	ByID("BareMin").appendChild(BoxBareMin);

	InsStr( "Label_Start", LangObj().Popup.InfoDisplay.Start);
	InsStr( "Label_Now", LangObj().Popup.InfoDisplay.Now);
	InsStr( "Label_Target", LangObj().Popup.InfoDisplay.Target);

	SetOutput(DefGoal.Loc);

	function DisplayDeadline(){
		var string = new countdown(CurDat().losedate).toString();
		if (new Date() > CurDat().losedate){
			string = LangObj().Popup.PastDeadline + string;
		}
		InsStr("dlout", string);
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
			document.getElementById( 'username'	).value = items.username;
			document.getElementById( 'token'	).value = items.token;
			updated_at		= items.updated_at;
			UName			= items.username;
			token			= items.token;
			DefGoal			= items.DefGoal;
			NeuGoalsArray	= items.GoalsData;
			if (items.username === "" || items.token === "") {
				InfoUpdate (LangObj().Options.NoUserData);
			} else if (NeuGoalsArray.length >= 1) {
				drawList();
			} else {
				InfoUpdate (LangObj().Options.NoUserData);
			}
		}
	);

	document.getElementById('save').addEventListener(
		'click',
		save_options
	);
}
function save_options() {
	UName = document.getElementById( 'username'	).value;
	token = document.getElementById( 'token'	).value;
	if (!DefGoal) {DefGoal = {Loc:0};}
	xhrHandler({
		name			: LangObj().Options.save_options.xhrName,
		SuccessFunction : AuthYes,
		FailFunction 	: AuthNo
	});
	function AuthYes (response){
		chrome.storage.sync.set({
			username	:	UName,
			token		:	token,
			DefGoal		:	DefGoal
		},AuthYesNotify);
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
	function AuthYesNotify () {
		InsStr("status",LangObj().Options.save_options.OptionsSaved);
		setTimeout(function(){InsStr("status","");},2000);
	}
	function HandleResponse(response) {
		console.log(JSON.parse(response));
	}
	function AuthNo (){
		InfoUpdate (LangObj().Options.save_options.Message404,60000);
	}
}
function DefaultHandle (i) {
	ElementsList[DefGoal.Loc].defa.textContent="-";
	DefGoal.Loc = i;
	DefGoal.Name = NeuGoalsArray[i].slug;
	ElementsList[DefGoal.Loc].defa.textContent = LangObj().Options.Default;
}
function drawList(){
	var TheList = document.getElementById("TheList");
	for (var i = 0; i < NeuGoalsArray.length; i++){
		ElementsList[i] = {
			"item"	: document.createElement('li'),
			"title"	: document.createElement('a'),
			"defa"	: document.createElement('a'),
			"hide"	: document.createElement('a'),
			"notify": document.createElement('a')
		};
		ElementsList[i].item.className  = "item";
		ElementsList[i].title.className = "title";
		ElementsList[i].defa.className = "default";
		ElementsList[i].hide.className = "hide";
		ElementsList[i].notify.className = "notify";
		ElementsList[i].item.id  = NeuGoalsArray[i].slug + "-item";
		ElementsList[i].title.id = NeuGoalsArray[i].slug + "-title";
		ElementsList[i].defa.id = NeuGoalsArray[i].slug + "-defaultBtn";
		ElementsList[i].hide.id = NeuGoalsArray[i].slug + "-HideBtn";
		ElementsList[i].notify.id = NeuGoalsArray[i].slug + "-NotifyBtn";
		ElementsList[i].title.textContent = NeuGoalsArray[i].title;
		ElementsList[i].defa.textContent = "-";
		ElementsList[i].hide.textContent = NeuGoalsArray[i].Notify;
		ElementsList[i].notify.textContent = NeuGoalsArray[i].Show;
		TheList.appendChild( ElementsList[i].item);
		   ElementsList[i].item.appendChild(ElementsList[i].title);
		   ElementsList[i].item.appendChild(ElementsList[i].defa);
		   ElementsList[i].item.appendChild(ElementsList[i].hide);
		   ElementsList[i].item.appendChild(ElementsList[i].notify);
		(function(_i) {
			LinkBM(ElementsList[_i].title.id,undefined,NeuGoalsArray[i].slug);
			ElementsList[_i].defa.addEventListener( "click", function() {DefaultHandle(_i);});
			// ElementsList[_i].hide.addEventListener( "click", MakeGoalsArray );
			// notify.addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
		if (NeuGoalsArray[i].slug === DefGoal.Name) {DefGoal.Loc = i;}
	}
	if (Number.isInteger(DefGoal.Loc)) {
		ElementsList[DefGoal.Loc].defa.innerHTML = LangObj().Options.Default;
	} else {
		DefGoal.Loc = 0;
		ElementsList[0].defa.innerHTML = LangObj().Options.Default;
	}
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
function ReturnGoalElement (object, old) {
	var DefaultArray = {
		Notify		: true,
		Show		: true
	};

	if		(!old) {
		old = DefaultArray;
		console.log("No Old");
	}
	else if ( typeof old === "string" && KeyedGoalsArray[old] ) {
		old = KeyedGoalsArray[old];
		console.log("String");
	}
	else if ( typeof old === "object" && old.Notify && old.Show ) {
		old = old;
		console.log("Object");
	}
	else	{
		console.log("Sommin Gone Wrong");
		return false;
	}

	return {
		"slug"			: object.slug,
		"title"			: object.title,
		"description"	: object.description,
		"id"			: object.id,
		"losedate"		: object.losedate*1000,		// Date
		"limsum"		: object.limsum,
		"DataPoints"	: [],
		"updated_at"	: object.updated_at*1000,	// Date
		"initday"		: object.initday*1000,		// Date
		"initval"		: object.initval,
		"curday"		: object.curday*1000,		// Date
		"curval"		: object.curval,
		"lastday"		: object.lastday*1000,		// Date
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
	return true;
	function HandleDatapoints ( response, QInfo ) {
		if ( !response || !QInfo ) { return false; }
		var frag = document.createDocumentFragment();
		var iCap = 10;
		NeuGoalsArray[QInfo.ArrayLoc].datapoints = response = JSON.parse(response);
		frag.appendChild(document.createTextNode(NeuGoalsArray[QInfo.ArrayLoc].title));
		frag.appendChild(document.createElement("BR"));
		frag.appendChild(document.createTextNode("Array length : " + response.length));
		// TODO String Localisation []
		frag.appendChild(document.createElement("BR"));
		if ( response.length <= 10 ) {
			iCap = response.length;
		}
		for (var i = 0; i < iCap; i++) {
			var span = frag.appendChild(document.createElement("span"));
				span.textContent = response[i].canonical;
			frag.appendChild(document.createElement("BR"));
		}
		ByID("data-points").appendChild(frag);
		console.log(response);
	}
	function GracefulFail () {
		var frag = document.createDocumentFragment();
		var FailBtn = frag.appendChild(document.createElement("DIV"));
			FailBtn.className = "Button";
			FailBtn.appendChild(document.createTextNode("The Download has failed!"));
			// TODO String Localisation []
			FailBtn.appendChild(document.createElement("BR"));
			FailBtn.appendChild(document.createTextNode("Click here to try again!"));
			// TODO String Localisation []
			FailBtn.addEventListener("click", function(){ DownloadDatapoints(); });
		ByID("data-points").innerHTML = "";
		ByID("data-points").appendChild(frag);
	}
}
/* --- --- --- ---		Depreciated Functions		--- --- --- --- */
function DepreciatedFunctions() {
	function GoalsGET(){
		xhrHandler({
			url : "/goals",
			SuccessFunction : function (response){
				GoalsJSON = JSON.parse(response);
				InfoUpdate ("Data has been downloaded"); // TO-DO String Localisation
				//if (pg==="popup") {HandleDownload();}
			}
		});
	}
	function DM(){
		var elem = document.getElementById('OiYouYeahYou-writing');
		elem.parentNode.removeChild(elem);
		return false;
	}
	function UNIXtoReadable(i){
		/* Copied from
			http://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
		*/
		var a = new Date(i * 1000);
		var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var year = a.getFullYear();
		var month = months[a.getMonth()];
		var date = a.getDate();
		var hour = a.getHours();
		var min = a.getMinutes();
		var sec = a.getSeconds();
		var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
		return time;
	}
	function ImageHandler (SomeArgs,MoreArgs){
		var ImageObject = document.getElementById("DisplayedGraph");
		function HasItLoaded(){
			if (!ImageObject.complete) {
				return false;
			}
			if (typeof ImageObject.naturalWidth !== "undefined" && ImageObject.naturalWidth === 0) {
				return false;
			}
			return true;
		}
		var TestVal = HasItLoaded();
		if (TestVal){
			alert(TestVal);
			console.log(TestVal);
			// some code to executre- given true
		} else {
			alert("yippeie");
		}
	}
	function UserGET(){
		xhrHandler({
			SuccessFunction : function(response) {
				UserJSON = JSON.parse(response);
				drawList();
				if (updated_at === UserJSON.updated_at){
					// TO-DO No need to update > write output
					document.getElementById("UpdateDifference").innerHTML 	=
					/**/"No Difference " + updated_at + " - " + UserJSON.updated_at; // TO-DO String Localisation
				} else {
					// TO-DO There needs to be an update
					document.getElementById("UpdateDifference").innerHTML 	=
					/**/"Difference " + updated_at + " - " + UserJSON.updated_at; // TO-DO String Localisation
				} // If differnece detection
			}
		});
	}
	function OptionsHandler(response) {
		UserJSON = JSON.parse(response);
		drawList();
		if (updated_at == UserJSON.updated_at){
			// TO-DO No need to update > write output
			InsStr("UpdateDifference",LangObj().Options.NoDifference +
			/**/	updated_at + " - " + UserJSON.updated_at);
		} else {
			// TO-DO There needs to be an update
			InsStr("UpdateDifference",LangObj().Options.Difference +
			/**/	updated_at + " - " + UserJSON.updated_at);
		} // If differnece detection
	}
	function MakeGoalsArray () {
		for (var i = 0; i < GoalsJSON.length; i++){
			GoalsArray[i] = {
				"slug"			: GoalsJSON[i].slug,
				"title"			: GoalsJSON[i].title,
				"description"	: GoalsJSON[i].description,
				"id"			: GoalsJSON[i].id,
				"graph_url"		: GoalsJSON[i].graph_url,
				"losedate"		: GoalsJSON[i].losedate,
				"limsum"		: GoalsJSON[i].limsum,
				"DataPoints"	: [],
				"updated_at"	: GoalsJSON[i].updated_at,
				"Notify"		: true,
				"Show"			: true
			};
		}
		console.log(GoalsArray);
		GoalsArray.sort(function (a,b) { // Sort Array by ID
			if		( a["id"] > b["id"] ){	return  1; }
			else if	( a["id"] < b["id"] ){	return -1; }
											return  0;
		});
	}
	function AsessGoalsArray(){
		var ResponseArray = GoalsJSON;
		var OfflineArray = GoalsArray;
		var ReturnArray = [];

		ResponseArray.sort(function (a,b) { // Sort Array by ID
			console.log(a["id"] + ", " + b["id"]);
			if		( a["id"] > b["id"] ){	return  1; }
			else if	( a["id"] < b["id"] ){	return -1; }
											return  0;
		});
		OfflineArray.sort(function (a,b) { // Sort Array by ID
			console.log(a["id"] + ", " + b["id"]);
			if		( a["id"] > b["id"] ){	return  1; }
			else if	( a["id"] < b["id"] ){	return -1; }
											return  0;
		});

		for (var i = 0; i < ResponseArray.length; i++){
			var r = OfflineArray.length;
			var neu = ResponseArray.pop();
			var old;

			while (r--) { if ( OfflineArray[r].id === neu.id ){break;}}
			if ( r === -1 ) { old = DefaultSettings;			}
			else 			{ old = OfflineArray.splice(r,1);	}

			if (neu.updated_at===old.updated_at)
					{ReturnArray.push(old);						}
			else 	{ReturnArray.push(ReturnGoalData(neu,old))	;}
		}
		GoalsArray = null;
		GoalsArray = OfflineArray;
		chrome.storage.sync.set(
			{GoalArray : OfflineArray},
			function() {InfoUpdate("Refresh data has been synced");} // TO-DO String Localisation []
		);
	}
}
