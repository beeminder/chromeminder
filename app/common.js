var ServerStatusTimer = "empty";
var UName, UserJSON, updated_at, token;
var GoalsJSON;// TODO Depreciate Variable
var GoalsArray = [];
var ElementsList = [];
var DefaultSettings = {
	id			: "default",
	notify		: true,
	show		: true,
	datapoints	: [],
	updated_at	: ""
};
var someVar = {updated_at:"",ArrayNo:""};// TODO Depreciate someVar
var DefGoal = {Loc:undefined, Name:""};
var RefreshTimeout = "empty";

var NeuGoalsArray = [];

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	if ( !args || !args.SuccessFunction ) { return false; }

	var xhr, urlSalt, xhrLocation, name;
	name		= IfSet(args.name,undefined," ");
	urlSalt		= IfSet(args.url);
	xhrLocation	= "https://www.beeminder.com/api/v1/users/" +
	/**/			UName + urlSalt + ".json?auth_token=" +	token;

	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			InfoUpdate (name + "Server 404 error");
			xhr.abort();
			if (args.FailFunction){args.FailFunction();}
		} else {
			InfoUpdate (name +
				"xhr Handler " + xhr.status +
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
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){ //
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: 	"",
			token		: 	"",
			GoalsData	:	[],
			DefGoal		:	{Loc:0}
		},
		Retrieval
	);
	document.getElementById("ButtonRefresh").addEventListener(
		"click", function(){DataRefresh();}
	);
}
function Retrieval (items){
	if (!items) { return false; }

	UName	= items.username;
	token	= items.token;
	DefGoal	= items.DefGoal;
	console.log(DefGoal)

	if (UName === "" || token === "") {
		var a = document.createElement('a');
		a.textContent = "You need to enter your details in the options page ";
		a.href = "/options.html";
		a.target = "_blank";
		// document.getElementById("SeverStatus").insertBefore(
		// 	a, null
		// );
		document.body.innerHTML = ""
		document.body.appendChild(a)
	} else { // TODO else if (!last API req was too soon)
		if (items.GoalsData.length >= 1){
			NeuGoalsArray = items.GoalsData;
			someVar.ArrayNo = DefGoal.Loc
			// IniDisplay();
		}

		( function(){HandleDownload()} )( /**/ );
	} //If Data is blank
}
function SetOutput(e){
	if (!Number.isInteger(e)){ e = someVar.ArrayNo;}
	else {someVar.ArrayNo = e;}
	ImageLoader(CurDat().graph_url);
	ByID("GoalLoc").textContent = CurDat().title;
	ByID("limsum").innerHTML = CurDat().limsum;
	LinkBM(	"ButtonGoal" 						);
	LinkBM(	"GraphLink"							);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	clearTimeout(RefreshTimeout);
	InfoUpdate ("Output Set : " + e);

	document.querySelector(".CountdownDisplay").style.backgroundColor = (function(){
		var daysleft = new countdown(CurDat().losedate).days;
		if	   	(daysleft  >  2)	{return "#39b44a";}
		else if (daysleft === 2)	{return "#325fac";}
		else if (daysleft === 1)	{return "#f7941d";}
		else if (daysleft === 0)	{return "#c92026";}
		else if (daysleft  <  0)	{return "#c92026";}
		return "purple";
	})( /**/ );

	function PrettyText(PreText, spcs, LeDate, Amount){
		var nbs = "";
		if (!Number.isInteger(spcs)){spcs = 1;}
		for (var i = 0; i < spcs; i++) {nbs+="&#160;";}

		return PreText +	nbs + "<b>" +
			new Date(LeDate).toISOString().substring(0, 10) +
			"&#160;" +	Amount +	"</b></br>";
	}

	var LastRoad = CurDat().fullroad[CurDat().fullroad.length-1];

	ByID("meta-data").innerHTML	=
		"Last update " + new countdown(CurDat().updated_at).toString() + " ago</br>" +
		PrettyText("Start",	2,	CurDat().initday,	CurDat().initval) +
		PrettyText("Now",	4,	CurDat().curday,	CurDat().curval	) +
		PrettyText("Target",1,	LastRoad[0]*1000,	LastRoad[1]		) +
		countdown(LastRoad[0]*1000).toString();
}
function CurDat(NeuObj){
	if (NeuObj) {NeuGoalsArray[someVar.ArrayNo] = NeuObj;}
	else		{return NeuGoalsArray[someVar.ArrayNo];}
}
function DataRefresh(i){
	if (!i){xhrHandler({
		url:"/goals/" + CurDat().slug + "/refresh_graph",
		name:"Refresh ",
		SuccessFunction : RefreshCall
	});}
	else if (i) {xhrHandler({
		url:"/goals/" + CurDat().slug,
		name:"Refresh - Goal Update",
		SuccessFunction: GoalGet
	});}
	function RefreshCall (response) {
		if (response === "true"){
			InfoUpdate ("Waiting for Graph to refresh");
			RefreshTimeout = setTimeout(function (){DataRefresh (1);},2500);
		} else if (response !== "true") {
			InfoUpdate ("Beeminder Sever Says no");
		} //If refresh true / !true
	}
	function GoalGet (response){
		InfoUpdate("iteration " + i);
		response = JSON.parse(response);
		if (response.updated_at === CurDat().updated_at){
			if (i<=6) {
				RefreshTimeout = setTimeout(function (){DataRefresh (i+1);}, GrowingDelay(i));
				InfoUpdate("No Updated difference, giving it another swing," +
				/**/											i + " " + GrowingDelay(i));
			} else {
				InfoUpdate("The goal seems not to have updated, aborting refresh");
			}
		} else {
			CurDat(null);
			CurDat(ReturnGoalElement(response));
			SetOutput();
			chrome.storage.sync.set(
				{GoalsData:NeuGoalsArray},
				function() {InfoUpdate("New goal data has been saved");}
			);
			InfoUpdate ("Graph Refreshed " + i + " " + CurDat().updated_at);
		}
	}
}
function HandleDownload(){
	xhrHandler({url:"/goals", SuccessFunction:HandleResponse});
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
			function() {InfoUpdate("Goal data has been saved");}
		);

		InfoUpdate ("Data has been downloaded");
		IniDisplay();
	}
}
function IniDisplay(){
	var frag;
	SetOutput(DefGoal.Loc);
	setInterval(DisplayDeadline,1000);// Sets Deadline Counter
	if (NeuGoalsArray.length > 1) { // Goal Selector
		frag = document.createDocumentFragment();
		for (var i = 0; i < NeuGoalsArray.length; i++){
			var a = frag.appendChild(document.createElement('a'));
			a.className = 'GoalIDBtn';
			a.id			= NeuGoalsArray[i].slug;
			a.textContent	= NeuGoalsArray[i].title;
			(function(_i) {a.addEventListener(
					"click",
					function() {SetOutput(_i);}
			);})(i);// TODO: Add an additonal goto link w/ each Selector
		}
		ByID("TheContent").innerHTML = "";
		ByID("TheContent").appendChild(frag);
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
				console.log("404 above is expected and normal ... silly chrome");
			}
		};
	var reader = new FileReader();
		reader.onloadend = function () {
			ByID("graph-img").src = reader.result;
		};
	imgxhr.send();
}
function DisplayDeadline(){
	var string = new countdown(CurDat().losedate).toString();
	if (new Date() > CurDat().losedate){
		string = "Past Deadline!</br>" + string;
	}
	ByID("dlout").innerHTML = string;
}
function GrowingDelay(i){
	if (!i) { return false; }
	return 2500 * Math.pow(2,(i-1));
}
/* --- --- --- ---		Options Functions			--- --- --- --- */
function OPTinit(){
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			updated_at	:	"",
			DefaultName :	""
		},
		function(items) {
			document.getElementById( 'username'	).value = items.username;
			document.getElementById( 'token'	).value = items.token;
			updated_at = items.updated_at;
			UName = items.username;
			token = items.token;
			DefGoal.Name = items.DefaultName;
			if (items.username === "" || items.token === "") {
				// TODO Goto options page
				InfoUpdate ("There be no data");
			} else {
				( function(){
					xhrHandler({
						SuccessFunction : function(response) {
							UserJSON = JSON.parse(response);
							drawList();
							if (updated_at === UserJSON.updated_at){
								// TODO No need to update > write output
								document.getElementById("UpdateDifference").innerHTML 	=
								/**/"No Difference " + updated_at + " - " + UserJSON.updated_at;
							} else {
								// TODO There needs to be an update
								document.getElementById("UpdateDifference").innerHTML 	=
								/**/"Difference " + updated_at + " - " + UserJSON.updated_at;
							} // If differnece detection
						}
					});
				} )( /**/ );
				// TODO get User data
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById('save').addEventListener('click', save_options);
}
function save_options() {
	UName = document.getElementById( 'username'	).value;
	token = document.getElementById( 'token'	).value;
	if (!DefGoal) {DefGoal = {Loc:0}}
	var xhrFunctions = {
		SuccessFunction : function (response){
			chrome.storage.sync.set({
				username	:	UName,
				token		:	token,
				DefGoal		:	DefGoal
			},
			function() {
				document.getElementById('status').textContent = 'Options saved.';
				setTimeout(function() {status.textContent = '';},2000);
			});
		},
		FailFunction : function (){
			InfoUpdate (
				"404: \n" +
				"There has been an error with the provided information.\n" +
				"The details have not been saved.\n" +
				"Please check of the details and try again.",
				60000
			);
		}
	};

	xhrHandler(xhrFunctions);
}
function DefaultHandle (i) {
	ElementsList[DefGoal.Loc].defa.textContent="-";
	DefGoal.Loc = i;
	DefGoal.Name = UserJSON.goals[i];
	ElementsList[DefGoal.Loc].defa.textContent="Default";
}
function drawList(){
	var TheList = document.getElementById("TheList");
	for (var i = 0; i < UserJSON.goals.length; i++){
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
		ElementsList[i].item.id  = UserJSON.goals[i] + "-item";
		ElementsList[i].title.id = UserJSON.goals[i] + "-title";
		ElementsList[i].defa.id = UserJSON.goals[i] + "-defaultBtn";
		ElementsList[i].hide.id = UserJSON.goals[i] + "-HideBtn";
		ElementsList[i].notify.id = UserJSON.goals[i] + "-NotifyBtn";
		ElementsList[i].title.textContent = UserJSON.goals[i];
		ElementsList[i].defa.textContent = "-";
		ElementsList[i].hide.textContent = "Hi";
		ElementsList[i].notify.textContent = "Hi";
		TheList.appendChild( ElementsList[i].item);
		   ElementsList[i].item.appendChild(ElementsList[i].title);
		   ElementsList[i].item.appendChild(ElementsList[i].defa);
		   ElementsList[i].item.appendChild(ElementsList[i].hide);
		   ElementsList[i].item.appendChild(ElementsList[i].notify);
		(function(_i) {
			LinkBM(ElementsList[_i].title.id,undefined,UserJSON.goals[i]);
			ElementsList[_i].defa.addEventListener( "click", function() {DefaultHandle(_i);});
			ElementsList[_i].hide.addEventListener( "click", MakeGoalsArray );
			// notify.addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
		if (UserJSON.goals[i] === DefGoal.Name) {DefGoal.Loc = i;}
	}
	if (Number.isInteger(DefGoal.Loc)) {
		ElementsList[DefGoal.Loc].defa.innerHTML = "Default";
	} else {
		DefGoal.Loc = 0
		ElementsList[0].defa.innerHTML = "Default";
	}
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
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
		function() {InfoUpdate("Refresh data has been synced");}
	);
}
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
function DownloadDatapoints (slug){
	if ( !slug ){ slug = CurDat().slug; }
	xhrHandler({
		url : "/goals/" + slug + "/datapoints",
		SuccessFunction : HandleDatapoints
	});
	function HandleDatapoints(response){
		ByID("data-points").textContent = response;
		response = JSON.parse(response);
	}
}
/* --- --- --- ---		Depreciated Functions		--- --- --- --- */
function GoalsGET(){
	xhrHandler({
		url : "/goals",
		SuccessFunction : function (response){
			GoalsJSON = JSON.parse(response);
			InfoUpdate ("Data has been downloaded");
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
				// TODO No need to update > write output
				document.getElementById("UpdateDifference").innerHTML 	=
				/**/"No Difference " + updated_at + " - " + UserJSON.updated_at;
			} else {
				// TODO There needs to be an update
				document.getElementById("UpdateDifference").innerHTML 	=
				/**/"Difference " + updated_at + " - " + UserJSON.updated_at;
			} // If differnece detection
		}
	});
}
