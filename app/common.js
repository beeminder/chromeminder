var ServerStatusTimer = "empty";
var UName, slug, UserJSON, updated_at, GoalsJSON;
var GoalsArray = [];
var ElementsList = []
var DefaultSettings = {
	id			: "default",
	notify		: true,
	show		: true,
	datapoints	: [],
	updated_at	: ""
}
var someVar = {updated_at:"",ArrayNo:""}// TODO Deal with someVar
var DefGoal = {Loc:undefined, Name:""}
var RefreshTimeout = "empty"
var PictureArray = []

var NeuGoalsArray = []

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	var xhr, urlSalt, xhrLocation, name
	name		= IfSet(args.name,undefined," ")
	urlSalt		= IfSet(args.url)
	xhrLocation	= "https://www.beeminder.com/api/v1/users/" +
	/**/			UName + urlSalt + ".json?auth_token=" +	token

	xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			InfoUpdate (name + "Server 404 error");
			xhr.abort();
			if (args.FailFunction){args.FailFunction()}
		} else {
			InfoUpdate (name +
				"xhr Handler " + xhr.status +
						 " / " + xhr.statusText +
						 " / " + xhr.readyState
			);
			if (xhr.status === 200 && xhr.readyState === 4){
				args.SuccessFunction(xhr.response)
			} //If Ready to access data
		} // If Access denied / allowed
	} // func xhr readyState
	xhr.open("GET", xhrLocation);
	xhr.send();
}
function InfoUpdate (text, time){
	var SeverStatus = document.getElementById("SeverStatus");
	if (!time){var time = 5000}
	if (ServerStatusTimer !== "empty"){clearTimeout(ServerStatusTimer)};
	SeverStatus.innerHTML = text;
	console.log(text);
	ServerStatusTimer = setTimeout(
		function() {SeverStatus.textContent = '';ServerStatusTimer="empty"},
		time
	);
}
function ByID (item){
	return document.getElementById(item)
}
function CurDat(NeuObj){
	if (NeuObj) {NeuGoalsArray[someVar.ArrayNo] = NeuObj}
	else		{return NeuGoalsArray[someVar.ArrayNo]}
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){ //
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: 	"",
			token		: 	"",
			GoalArray	:	[],
			GoalsData	:	[],
			DefaultName :	""
		},
		function(items) {
			UName = items.username;
			token = items.token;
			DefGoal.Name = items.DefaultName

			if (items.GoalsData.length >= 1){
				NeuGoalsArray = items.GoalsData
				for (i = 0; i < items.GoalsData.length; i++){
					/* Searches for Default, This doesn't really need to happen
						when this data has already been handled,
						TODO put this into a more optimal location*/
					if (DefGoal.Name == items.GoalsData[i].slug){DefGoal.Loc = i}
				}
				someVar.ArrayNo = DefGoal.Loc
				IniDisplay()
			}

			if (UName === "" || token === "") {
				var a = document.createElement('a');
				a.textContent = "You need to enter your details in the options page ";
				a.href = "/options.html"
				a.target = "_blank"
				document.getElementById("SeverStatus").insertBefore(
					a, document.getElementById(SeverStatus)
				)

			} else { // TODO else if (!last API req was too soon)
				( function(){HandleDownload()} )();
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById("ButtonRefresh").addEventListener(
		"click",
		function(){DataRefresh()}
	)
}
function SetOutput(e){
	if (!e){var e = someVar.ArrayNo}
	else {someVar.ArrayNo = e;}
	ImageLoader(CurDat().graph_url)
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
	})()

	function PrettyText(PreText, spcs, LeDate, Amount){
		var nbs = ""
		if (!Number.isInteger(spcs)){var spcs = 1;}
		for (i = 0; i < spcs; i++) {nbs+="&#160;"}

		return string =	PreText +	nbs +
			new Date(LeDate).toISOString().substring(0, 10) +
			"&#160;" +	Amount +	"</br>";
	}

	var roadVar = CurDat().fullroad
	var something = roadVar[roadVar.length-1][0]*1000

	var updatedstring	= "Last update " + new countdown(CurDat().updated_at).toString() + " ago</br>"
	var initstring 		= PrettyText("Start",	2,CurDat().initday, 0)
	var curstring 		= PrettyText("Now",		4,CurDat().curday, 0)
	var laststring 		= PrettyText("Target",	1,something, 0)
	ByID("meta-data").innerHTML = updatedstring + initstring + curstring + laststring
}
function DataRefresh(i){
	/*	TODO
		[#]		xhr singular goal
		[#]		if updated at values are differetn {
		[ ]			merge neu and old goal
		[#]			setoutpt
		[ ]			sync new data with chrome
				}
	*/
	if (!i){
		xhrHandler({
			url:"/goals/" + CurDat().slug + "/refresh_graph",
			name:"Refresh ",
			SuccessFunction : function (response){
				if (response === "true"){
					InfoUpdate ("Waiting for Graph to refresh");
					RefreshTimeout = setTimeout(function (){DataRefresh (1)},2500)
				} else if (response !== "true") {
					InfoUpdate ("Beeminder Sever Says no");
				} //If refresh true / !true
			}
		})
	}
	else if (i) {xhrHandler({
		url:"/goals/" + CurDat().slug,
		name:"Refresh - Goal Update",
		SuccessFunction:function(response){
			InfoUpdate("iteration " + i)
			response = JSON.parse(response)
			if (response.updated_at === CurDat().updated_at){
				if (i<=6) {
					RefreshTimeout = setTimeout(function (){DataRefresh (i+1)}, GrowingDelay(i));
					InfoUpdate("No Updated difference, giving it another swing,"
					/**/											+ i + " " + GrowingDelay(i))
				} else {
					InfoUpdate("The goal seems not to have updated, aborting refresh")
				}
			} else {
				CurDat(ReturnGoalElement(response))
				SetOutput()
				chrome.storage.sync.set(
					{GoalsData:NeuGoalsArray},
					function() {InfoUpdate("New goal data has been saved")}
				)
				InfoUpdate ("Graph Refreshed " + i + " " + CurDat().updated_at);
			}
		} // SuccessFunction
	})} // xhrHandler
}
function HandleDownload(){
	xhrHandler({ // Goals Get
		url : "/goals",
		SuccessFunction : function (response){
			var WorkingResponse = JSON.parse(response);
			var DefHolding;

			NeuGoalsArray = [] // Clearing Array TODO Implement a merging script

			for (i = 0; i < WorkingResponse.length; i++){
				if (DefGoal.Name == WorkingResponse[i].slug){DefHolding = i};
				NeuGoalsArray[i] = ReturnGoalElement(WorkingResponse[i]);
			}

			if (!DefHolding){DefHolding = 0};
			DefGoal.Loc = DefHolding;

			chrome.storage.sync.set(
				{GoalsData:NeuGoalsArray},
				function() {InfoUpdate("Goal data has been saved")}
			)

			// for (i = 0; i < GoalsJSON.length; i++){ // Image Handling
			// 	PictureArray[i] = new Image()
			// 	PictureArray[i].src = GoalsJSON[i].graph_url
			// }
			InfoUpdate ("Data has been downloaded");
			IniDisplay();
			GoalsJSON = WorkingResponse // TODO Depreciate Variable
		}
	})
}
function IniDisplay(){
	SetOutput(DefGoal.Loc);
	setInterval(DisplayDeadline,1000);// Sets Deadline Counter
	if (NeuGoalsArray.length > 1) { // Goal Selector
		var TheContentArea = document.getElementById("TheContent")
		TheContentArea.innerHTML = ""
		for (i = 0; i < NeuGoalsArray.length; i++){
			var a = document.createElement('a');
			a.className = 'GoalIDBtn';
			a.id			= NeuGoalsArray[i].slug;
			a.textContent	= NeuGoalsArray[i].title;
			TheContentArea.appendChild(a);
			(function(_i) {a.addEventListener(
					"click",
					function() {SetOutput(_i);}
			)})(i);// TODO: Add an additonal goto link w/ each Selector
		}
	};
}
function LinkBM(x,y,z) {
	if (!y) {var y = ""};
	if (!z){z = CurDat().slug;}
	document.getElementById(x).href=
	"https://www.beeminder.com" + "/" + UName + "/" + z + "/" + y;
}
function ImageLoader(FooURL){
	if (!FooURL){
		var FooURL = "http://brain.beeminder.com/nonce/oiyouyeahyou+writing+57436fce128d1c1d8c000201.png"
	}
	var imgxhr = new XMLHttpRequest();
		imgxhr.open("GET",FooURL  + "?" + new Date().getTime());
		imgxhr.responseType = "blob";
		imgxhr.onload = function (){
			reader.readAsDataURL(imgxhr.response)
		};
	var reader = new FileReader();
		reader.onloadend = function () {
			ByID("graph-img").src = reader.result
		}
	imgxhr.send();
}
function DisplayDeadline(){
	var string = new countdown(CurDat().losedate).toString();
	if (new Date() > CurDat().losedate){
		string = "Past Deadline!</br>" + string
	}
	ByID("dlout").innerHTML = string
}
function GrowingDelay(i){return 2500 * Math.pow(2,(i-1))}
/* --- --- --- ---		Options Functions			--- --- --- --- */
function OPTinit(){
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			updated_at	:	"",
			GoalArray	:	{},
			DefaultName :	""
		},
		function(items) {
			console.log(items.GoalArray.length);
			document.getElementById( 'username'	).value = items.username;
			document.getElementById( 'token'	).value = items.token;
			updated_at = items.updated_at;
			UName = items.username;
			token = items.token;
			DefGoal.Name = items.DefaultName
			if (items.username === "" || items.token === "") {
				// TODO Goto options page
				InfoUpdate ("There be no data")
			} else {
				( function(){
					xhrHandler({
						SuccessFunction : function(response) {
							UserJSON = JSON.parse(response);
							drawList()
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
					xhrHandler({ // Goals Get
						url : "/goals",
						SuccessFunction : function (response){
							GoalsJSON = JSON.parse(response);
							InfoUpdate ("Data has been downloaded")
						}
					})
				} )( /**/ );
				// TODO get User data
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById('save').addEventListener('click', save_options);
	//document.getElementById('OiYouYeahYou-writing').addEventListener('click', DM);
}
function save_options() {
	UName = document.getElementById( 'username'	).value
	token = document.getElementById( 'token'	).value
	var xhrFunctions = {
		SuccessFunction : function (response){
			chrome.storage.sync.set({
				username	:	UName,
				token		:	token,
				DefaultName	:	DefGoal.Name//,
				//GoalArray	:	UserJSON.goals
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
			)
		}
	}

	xhrHandler(xhrFunctions)
}
function DefaultHandle (i) {
	ElementsList[DefGoal.Loc].defa.textContent="-";
	DefGoal.Loc = i;
	DefGoal.Name = UserJSON.goals[i];
	ElementsList[DefGoal.Loc].defa.textContent="Default";
}
function drawList(){
	var TheList = document.getElementById("TheList");
	for (i = 0; i < UserJSON.goals.length; i++){
		ElementsList[i] = {
			"item"	: document.createElement('li'),
			"title"	: document.createElement('a'),
			"defa"	: document.createElement('a'),
			"hide"	: document.createElement('a'),
			"notify": document.createElement('a')
		}
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
			LinkBM(ElementsList[_i].title.id,undefined,UserJSON.goals[i])
			ElementsList[_i].defa.addEventListener( "click", function() {DefaultHandle(_i);});
			ElementsList[_i].hide.addEventListener( "click", MakeGoalsArray );
			// notify.addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
		if (UserJSON.goals[i] === DefGoal.Name) {DefGoal.Loc = i;}
	}
	if (Number.isInteger(DefGoal.Loc)) {
		ElementsList[DefGoal.Loc].defa.innerHTML = "Default";
	} else {
		// TODO No Default Present
	}
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
function MakeGoalsArray () {
	for (i = 0; i < GoalsJSON.length; i++){
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
	console.log(GoalsArray)
	GoalsArray.sort(function (a,b) { // Sort Array by ID
		if		( a["id"] > b["id"] ){	return  1; }
		else if	( a["id"] < b["id"] ){	return -1; }
										return  0;
	})
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
	})
	OfflineArray.sort(function (a,b) { // Sort Array by ID
		console.log(a["id"] + ", " + b["id"]);
		if		( a["id"] > b["id"] ){	return  1; }
		else if	( a["id"] < b["id"] ){	return -1; }
										return  0;
	})

	for (i = 0; i < ResponseArray.length; i++){
		var r = OfflineArray.length;
		var neu = ResponseArray.pop()
		var old;

		while (r--) { if ( OfflineArray[r].id === neu.id ){break;}}
		if ( r === -1 ) { old = DefaultSettings;			}
		else 			{ old = OfflineArray.splice(r,1);	}

		if (neu.updated_at===old.updated_at)
				{ReturnArray.push(old)						}
		else 	{ReturnArray.push(ReturnGoalData(neu,old))	}
	}
	GoalsArray = null
	GoalsArray = OfflineArray;
	chrome.storage.sync.set(
		{GoalArray : OfflineArray},
		function() {SeverStatusUpdate("Refresh data has been synced")}
	);
}
function ReturnGoalData (neu, old){
	var WrkID = old.id
	if (WrkID === "default") {WrkID = neu.id}
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
	}}
}
function ReturnGoalElement (object) {
	return {
		"slug"			: object.slug,
		"title"			: object.title,
		"description"	: object.description,
		"id"			: object.id,
		"graph_url"		: object.graph_url,
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
/* --- --- --- ---		Depreciated Functions		--- --- --- --- */
function GoalsGET(){
	xhrHandler({
		url : "/goals",
		SuccessFunction : function (response){
			GoalsJSON = JSON.parse(response);
			InfoUpdate ("Data has been downloaded")
			if (pg==="popup") {HandleDownload()}
		}
	})
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
	var ImageObject = document.getElementById("DisplayedGraph")
	function HasItLoaded(){
		if (!ImageObject.complete) {
			return false;
		}
		if (typeof ImageObject.naturalWidth !== "undefined" && ImageObject.naturalWidth === 0) {
			return false;
		}
		return true
	}
	var TestVal = HasItLoaded()
	if (TestVal){
		alert(TestVal)
		console.log(TestVal)
		// some code to executre- given true
	} else {
		alert("yippeie")
	}
}
function UserGET(){
	xhrHandler({
		SuccessFunction : function(response) {
			UserJSON = JSON.parse(response);
			drawList()
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
	})
}
function IfSet(input, bef, aft){
	var string

	if (input)		{
						string = 		input
		if (bef) 	{	string =  bef +	string			}
		if (aft) 	{	string =		string + aft	}
	}
	else 			{	string = ""						}

	return string
}
