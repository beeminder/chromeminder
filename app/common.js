var ServerStatusTimer = "empty";
var UName, UserJSON, updated_at, token, PrefLangArray;
var GoalsArray = [];
var ElementsList = [];
var someVar = {updated_at:"",ArrayNo:""};// TODO Depreciate someVar
var DefGoal = {Loc:undefined, Name:""};
var RefreshTimeout = "empty";

var NeuGoalsArray = [];

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	if ( !args || !args.SuccessFunction ) { return false; }

	if (!navigator.onLine) {
		if ( args.OfflineFunction ) { args.OfflineFunction(); }
		else { InfoUpdate("Currently Offline"); }
		return false
	}

	var xhr, urlSalt, xhrLocation, name;
	name		= IfSet(args.name,undefined," ");
	urlSalt		= IfSet(args.url);
	xhrLocation	= "https://www.beeminder.com/api/v1/users/" +
	/**/			UName + urlSalt + ".json?auth_token=" +	token;

	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			InfoUpdate (name + LangObj().xhr.Status404);
			xhr.abort();
			if (args.FailFunction){args.FailFunction();}
		} else {
			InfoUpdate (name +
				LangObj().xhr.StateChangeInfo + xhr.status +
						 " / " + xhr.statusText +
						 " / " + xhr.readyState
			);
			if (xhr.status === 200 && xhr.readyState === 4){
				if (!args.SuccessExtraVar){
					args.SuccessFunction(xhr.response);
				 } else {
 					args.SuccessFunction(
						xhr.response,
						args.SuccessExtraVar
					);
				}
			} //If Ready to access data
		} // If Access denied / allowed
	}; // func xhr readyState

	xhr.open("GET", xhrLocation);
	xhr.send();
}
function IfSet(input, bef, aft){
	var string;

	if (input)		{
						string = 		input;
		if (bef) 	{	string =  bef +	string			;}
		if (aft) 	{	string =		string + aft	;}
	}
	else 			{	string = ""						;}

	return string;
}
function InfoUpdate (text, time){
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
function ByID (item){return document.getElementById(item);}
function LinkBM(x,y,z) {
	if (!x) { return false; }
	if (!y) {y = "";}
	if (!z) {z = CurDat().slug;}
	document.getElementById(x).href=
	"https://www.beeminder.com" + "/" + UName + "/" + z + "/" + y;
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
function ISODate(x) {
	return new Date(x).toISOString().substring(0, 10);
}
function InsStr(element,string){
	ByID(element).textContent = string;
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){ //
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: 	"",
			token		: 	"",
			DefGoal		:	{Loc:0},
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

		if (UName === "" || token === "") {
			var a = document.createElement('a');
			a.textContent = LangObj().Popup.NavToOptions;
			a.href = "/options.html";
			a.target = "_blank";
			document.body.innerHTML = "";
			document.body.appendChild(a);
		} else { // TODO else if (!last API req was too soon)
			( function(){HandleDownload()} )( /**/ );
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
			var DefHolding;

			NeuGoalsArray = []; // Clear Array TODO Implement merging script

			for (var i = 0; i < WorkingResponse.length; i++){
				if (DefGoal.Name == WorkingResponse[i].slug){DefHolding = i;}
				NeuGoalsArray[i] = ReturnGoalElement(WorkingResponse[i]);
			}

			if (!DefHolding){DefHolding = 0;}
			someVar.ArrayNo = DefGoal.Loc = DefHolding;

			chrome.storage.sync.set(
				{
					GoalsData	: NeuGoalsArray,
					DefGoal		: DefGoal
				},
				function() {InfoUpdate(LangObj().Popup.HandleDownload.DataSaved);}
			);

			InfoUpdate (LangObj().Popup.HandleDownload.DataDownloaded);
			IniDisplay();
		}
		function ItHasFailed() {
			InfoUpdate("Download has failed, initalising from offline data")
			chrome.storage.sync.get(
				{ GoalsData	:	[] },
				function (items) {
					NeuGoalsArray = items.GoalsData;

					if (items.GoalsData.length >= 1){
						someVar.ArrayNo = DefGoal.Loc
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
function SetOutput(e){
	if (!Number.isInteger(e)){ e = someVar.ArrayNo;}
	else {someVar.ArrayNo = e;}

	ImageLoader(CurDat().graph_url);
	InsStr("GoalLoc", CurDat().title);
	InsStr("limsum", CurDat().limsum);
	LinkBM(	"ButtonGoal" 						);
	LinkBM(	"GraphLink"							);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	clearTimeout(RefreshTimeout);
	InfoUpdate (LangObj().Popup.OutputSet + e);

	document.querySelector(".CountdownDisplay").style.backgroundColor = (function(){
		var daysleft = new countdown(CurDat().losedate).days;
		if	   	(daysleft  >  2)	{return "#39b44a";}
		else if (daysleft === 2)	{return "#325fac";}
		else if (daysleft === 1)	{return "#f7941d";}
		else if (daysleft === 0)	{return "#c92026";}
		else if (daysleft  <  0)	{return "#c92026";}
		return "purple";
	})( /**/ );

	var LastRoad = CurDat().fullroad[CurDat().fullroad.length-1];
	InsStr("LastUpdateDate", LangObj().Popup.InfoDisplay.LastUpdate(
			new countdown(CurDat().updated_at,null,null,1).toString()
	));
	InsStr("Info_Start", ISODate(CurDat().initday)	+" - "+ CurDat().initval);
	InsStr("Info_Now", ISODate(CurDat().curday)	+" - "+ CurDat().curval);
	InsStr("Info_Target", ISODate(LastRoad[0]*1000)	+" - "+ LastRoad[1]);
	InsStr("Info_Countdown", countdown(LastRoad[0]*1000,null,null,2).toString());
}
function CurDat(NeuObj){
	if (NeuObj) {NeuGoalsArray[someVar.ArrayNo] = NeuObj;}
	else		{return NeuGoalsArray[someVar.ArrayNo];}
}
function DataRefresh(i){
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
function IniDisplay(){
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
	InsStr( "Label_Target", LangObj().Popup.InfoDisplay.Target)

	SetOutput(DefGoal.Loc);

	function DisplayDeadline(){
		var string = new countdown(CurDat().losedate).toString();
		if (new Date() > CurDat().losedate){
			string = LangObj().Popup.PastDeadline + string;
		}
		InsStr("dlout", string);
	}
}
function ImageLoader(url){
	if (!url){return false;}

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
			NeuGoalsArray	= items.GoalsData
			if (items.username === "" || items.token === "") {
				InfoUpdate (LangObj().Options.NoUserData);
			} else if (NeuGoalsArray.length >= 1) {
				drawList()
			} else {
				InfoUpdate (LangObj().Options.NoUserData)
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
		DefGoal.Loc = 0
		ElementsList[0].defa.innerHTML = LangObj().Options.Default;
	}
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
function ReturnGoalData (neu, old){
	var WrkID = old.id;
	if (WrkID === "default") {WrkID = neu.id;}
	if (neu.id === WrkID){return {
			"slug"			: neu.slug,
			"title"			: neu.title,
			"description"	: neu.description,
			"id"			: WrkID,
			"graph_url"		: neu.graph_url,
			"losedate"		: neu.losedate,
			"limsum"		: neu.limsum,
			//"datapoints"	: ReturnDataPoints(neu,old),
			"updated_at"	: neu.updated_at,
			"Notify"		: old.notify,
			"Show"			: old.show
	};}
}
function ReturnGoalElement (object) {
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
		"Notify"		: true,
		"Show"			: true
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
			FailBtn.addEventListener("click", function(){ DownloadDatapoints() });
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
