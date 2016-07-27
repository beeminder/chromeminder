var ServerStatusTimer = "empty";
var UName, Slug, Deadline, UserJSON, updated_at, GoalsJSON;
var BeeURL = "https://www.beeminder.com";
var DefaultGoal = 0;
var GoalsArray = [];
var ElementsList = []
var DefaultSettings = {
	id			: "default",
	notify		: true,
	show		: true,
	datapoints	: [],
	updated_at	: ""
}

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			InfoUpdate ("Server 404 error");
			xhr.abort();
			if (args.FailFunction){args.FailFunction()}
		} else {
			InfoUpdate (
				"xhr Handler " + xhr.status +
						 " / " + xhr.statusText +
						 " / " + xhr.readyState
			);
			if (xhr.status === 200 && xhr.readyState === 4){
				args.SuccessFunction(xhr.response)
			} //If Ready to access data
		} // If Access denied / allowed
	} // func xhr readyState

	var neurl
	if	(args.url)	{ neurl = args.url	}
	else			{ neurl = ""		}

	var nurl =	"https://www.beeminder.com/api/v1/users/" +
	/**/		UName + neurl + ".json?auth_token=" +	token

	xhr.open("GET", nurl);
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
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){ //
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			DefaultGoal	:	0,
			GoalArray	:	[]
		},
		function(items) {
			UName = items.username;
			token = items.token;
			DefaultGoal = items.DefaultGoal;
			if (UName === "" || token === "") {
				var a = document.createElement('a');
				a.textContent = "You need to enter your details in the options page ";
				a.href = "/options.html"
				a.target = "_blank"
				document.getElementById("SeverStatus").insertBefore(
					a, document.getElementById(SeverStatus)
				)
			} else {
				( function(){ GoalsGET(); } )( /**/ );
			} //If Data is blank
		} // function Sync Get
	);
}
function SetOutput(e){
	Slug = GoalsJSON[e].slug
	document.getElementById("graph-img").src=
		BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
	document.getElementById("GoalLoc").innerHTML = /*UName + " / " +*/ GoalsJSON[e].title;
	Deadline = GoalsJSON[e].losedate*1000
	document.getElementById("limsum").innerHTML = GoalsJSON[e].limsum;
	LinkBM(	"ButtonGoal",		""				);
	LinkBM(	"GraphLink",		""				);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	InfoUpdate ("Output Set : " + e)
}
function DataRefresh(i){
	//
	if ( i <= 5 ) { DataRefresh ( i + 1 ) }
}
function RefreshCurrentGraph(){
	xhrHandler({
		url:"/goals/" + Slug + "/refresh_graph",
		SuccessFunction : function (response){
			if (response === "true"){
				InfoUpdate ("Waiting for Graph to refresh")
				setTimeout(function (){
					document.getElementById("graph-img").src=
						BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
					InfoUpdate ("Graph Refreshed, but a page refresh needs to happen for new data");
					// TODO SetOutput with new data from a new xhr
				}, 5000);
			} else if (response !== "true") {
				InfoUpdate ("Beeminder Sever Says no");
			} //If refresh true / !true
		}
	})
}
function HandleDownload(){
	if (DefaultGoal > GoalsJSON.length){DefaultGoal=0};
	SetOutput(DefaultGoal);
	setInterval(
		function(){
			document.getElementById("dlout").innerHTML=countdown(Deadline).toString();
		},100
	);
	if (GoalsJSON.length > 1) { for (i = 0; i < GoalsJSON.length; i++){
		var a = document.createElement('a');
		a.className = 'GoalIDBtn';
		a.id = /*UName + '-' +*/ GoalsJSON[i].slug;
		a.textContent = /*UName + ' / ' +*/ GoalsJSON[i].title;
		document.getElementById("TheContent").appendChild(a);
		(function(_i) {
			a.addEventListener("click", function() {SetOutput(_i);});
		})(i);// TODO: Add an additonal goto link w/ each Selector
	}};
	document.getElementById("ButtonRefresh").addEventListener("click", RefreshCurrentGraph)
}
function LinkBM(x,y) {document.getElementById(x).href=BeeURL+"/"+UName+"/"+Slug+"/"+y;}
/* --- --- --- ---		Options Functions			--- --- --- --- */
function OPTinit(){
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			updated_at	:	"",
			DefaultGoal	:	0,
			GoalArray	:	{}
		},
		function(items) {
			console.log(items.GoalArray.length);
			document.getElementById( 'username'	).value = items.username;
			document.getElementById( 'token'	).value = items.token;
			updated_at = items.updated_at;
			UName = items.username;
			token = items.token;
			DefaultGoal = parseInt(items.DefaultGoal);
			if (items.username === "" || items.token === "") {
				// TODO Goto options page
				InfoUpdate ("There be no data")
			} else {
				( function(){ UserGET();GoalsGET() } )( /**/ );
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
				DefaultGoal	:	DefaultGoal//,
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
	ElementsList[DefaultGoal].defa.textContent="-";
	DefaultGoal =i;
	ElementsList[DefaultGoal].defa.textContent="Default";
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
		ElementsList[i].title.href = BeeURL + "/" + UName + "/" + UserJSON.goals[i] + "/"
		TheList.appendChild( ElementsList[i].item);
		   ElementsList[i].item.appendChild(ElementsList[i].title);
		   ElementsList[i].item.appendChild(ElementsList[i].defa);
		   ElementsList[i].item.appendChild(ElementsList[i].hide);
		   ElementsList[i].item.appendChild(ElementsList[i].notify);
		(function(_i) {
			ElementsList[_i].defa.addEventListener( "click", function() {DefaultHandle(_i);});
			ElementsList[_i].hide.addEventListener( "click", MakeGoalsArray );
			// notify.addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
	}
	ElementsList[DefaultGoal].defa.innerHTML = "Default";
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
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
}///////////////////////////////////////////////////////////_pop
function MakeGoalsArray () {
	console.log("run " + GoalsJSON.length)
		// This is the first time and wipe slate clean function
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
		console.log(a["id"] + ", " + b["id"]);
		if		( a["id"] > b["id"] ){	return  1; }
		else if	( a["id"] < b["id"] ){	return -1; }
										return  0;
	})
	/*
		TODO:
			Assess if the two data structures sre different
			How to handle new graphs
			How to handle deleted graphs
			Default New Goal Behaviour
	*/
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
function ReturnDataPoints (neu, old) {
	var object = [];
	object.concat(neu.datapoints,old.datapoints);
	return object
}
/*
	on array diffrece detection {
		contrast IDs of each array
		asses if there has been a deletion
		asses if there is a new goal
		forget deleted goal data
		set new goal data as default
		ask user to look over
	}
*/
/* --- --- --- ---		Deprecieated Functions		--- --- --- --- */
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
