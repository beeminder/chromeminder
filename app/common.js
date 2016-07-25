var ServerStatusTimer = "empty";
var UName, Slug, Deadline, UserJSON, updated_at, GoalsJSON;
var BeeURL = "https://www.beeminder.com";
var ApiURL = "https://www.beeminder.com/api/v1/users/";
var DefaultGoal = 0;
var GoalsArray = [];
var w = [];var aT = [];var aD = [];var aH = [];var aN = []
var DefaultSettings = {
	"id"		: "default"
	"notify"	: true,
	"show"		: true
}

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
}///////////////////////////////////////////////////////////_pop
function GoalsGET(){
	var urlinput = ApiURL + UName + "/goals.json?auth_token=" + token
	xhrHandler(urlinput, function (response){
			GoalsJSON = JSON.parse(response);
			ServerStatusUpdate("Data has been downloaded")
			if (pg==="popup") {HandleDownload()}
	})
}///////////////////////////////////////////////////////////_common
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
}////////////////////////////////////////////////////////////_pop
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
}///////////////////////////////////////////////////////////_pop
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
	ServerStatusUpdate("Output Set : " + e)
}///////////////////////////////////////////////////////////_pop
function RefreshCurrentGraph(){
	var urlinput = ApiURL + UName + "/goals/" + Slug + "/refresh_graph.json?auth_token=" + token
	xhrHandler(urlinput, function (response){
		if (response === "true"){
			ServerStatusUpdate("Waiting for Graph to refresh")
			setTimeout(function (){
				document.getElementById("graph-img").src=
					BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
				ServerStatusUpdate("Graph Refreshed, but a page refresh needs to happen for new data");
				// TODO SetOutput with new data from a new xhr
			}, 5000);
		} else if (response !== "true") {
			ServerStatusUpdate("Beeminder Sever Says no");
		} //If refresh true / !true
	})
}
function ServerStatusUpdate (text){
	var SeverStatus = document.getElementById("SeverStatus");
	if (ServerStatusTimer !== "empty"){clearTimeout(ServerStatusTimer)};
	SeverStatus.innerHTML = text;
	console.log(text);
	ServerStatusTimer = setTimeout(
		function() {SeverStatus.textContent = '';ServerStatusTimer="empty"},
		5000
	);
}
function LinkBM(x,y) {document.getElementById(x).href=BeeURL+"/"+UName+"/"+Slug+"/"+y;}
function save_options() {
	chrome.storage.sync.set(
		{
			username	:	document.getElementById( 'username'	).value,
			token		:	document.getElementById( 'token'	).value,
			DefaultGoal	:	DefaultGoal,
			GoalArray	:	UserJSON.goals
		},
		function() {
			document.getElementById('status').textContent = 'Options saved.';
			setTimeout(function() {status.textContent = '';},2000);
		}
	);
}///////////////////////////////////////////////////////////Opt
function DM(){
	var elem = document.getElementById('OiYouYeahYou-writing');
	elem.parentNode.removeChild(elem);
	return false;
}///////////////////////////////////////////////////////////Opt
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
				ServerStatusUpdate("There be no data")
			} else {
				( function(){ UserGET();GoalsGET() } )( /**/ );
				// TODO get User data
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById('save').addEventListener('click', save_options);
	//document.getElementById('OiYouYeahYou-writing').addEventListener('click', DM);
}
function UserGET(){
	var urlinput = BeeURL + "/api/v1/users/" + UName + ".json?auth_token=" + token
	xhrHandler(urlinput, function (response){
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
	})
}///////////////////////////////////////////////////////////_pop
function drawList(){
	var TheList = document.getElementById("TheList");
	for (i = 0; i < UserJSON.goals.length; i++){
		w[i]  = document.createElement('li')
		aT[i] = document.createElement('a');
		aD[i] = document.createElement('a');
		aH[i] = document.createElement('a');
		aN[i] = document.createElement('a');
		w[i].className  = "item";
		aT[i].className = "title";
		aD[i].className = "default";
		aH[i].className = "hide";
		aN[i].className = "notify";
		w[i].id  = UserJSON.goals[i] + "-item";
		aT[i].id = UserJSON.goals[i] + "-title";
		aD[i].id = UserJSON.goals[i] + "-defaultBtn";
		aH[i].id = UserJSON.goals[i] + "-HideBtn";
		aN[i].id = UserJSON.goals[i] + "-NotifyBtn";
		aT[i].textContent = UserJSON.goals[i];
		aD[i].textContent = "-";
		aH[i].textContent = "Hi";
		aN[i].textContent = "Hi";
		aT[i].href = BeeURL + "/" + UName + "/" + UserJSON.goals[i] + "/"
		TheList.appendChild( w[i]);
		   w[i].appendChild(aT[i]);
		   w[i].appendChild(aD[i]);
		   w[i].appendChild(aH[i]);
		   w[i].appendChild(aN[i]);
		(function(_i) {
			aD[i].addEventListener( "click", function() {DefaultHandle(_i);});
			aH[i].addEventListener( "click", MakeGoalsArray );
			// aN[i].addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
	}
	aD[DefaultGoal].innerHTML = "Default";
}
function DefaultHandle (i) {
	aD[DefaultGoal].textContent="-";
	DefaultGoal =i;
	aD[DefaultGoal].textContent="Default";
}
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
	GoalsArray.sort(function (a,b) {
		console.log(a["id"])
		if( a["id"] > b["id"]){
			return 1;
		} else if ( a["id"] < b["id"] ){
			return -1;
		}
		return 0;
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
	var NewDataArray = [];
	var GoalsToDelete = [];

	for (i = 0; i < GoalsArray.length; i++){
		var r = GoalsJSON.length;
		while (r--) { if ( GoalsJSON[r].id === GoalsArray[i].id ){ break; }}

		if ( r === -1 ) { GoalsToDelete.push(i)}
	}


	for (r = 0; r < GoalsToDelete.length; r++){
		GoalsArray.splice(r,1)
	} // TODO : NOT GOING TO WORK

	// GoalsOfflineArray.forEach(function(item){
	// 	if (GoalsOfflineArray = false){
	// 		// new goal
	// 	}
	// })
}
function ReturnGoalData (neu, old){
	var oldid = old.id
	if (oldid === "default") {oldid = neu.id}
	if (neu.id === oldid){
		return {
			"slug"			: neu.slug,
			"title"			: neu.title,
			"description"	: neu.description,
			"id"			: oldid,
			"graph_url"		: neu.graph_url,
			"losedate"		: neu.losedate,
			"limsum"		: neu.limsum,
			"datapoints"	: ReturnDataPoints(neu,old),
			"updated_at"	: neu.updated_at,
			"Notify"		: old.notify,
			"Show"			: old.show
		};
	}
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
function xhrHandler(url, FunctionToInvoke){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			ServerStatusUpdate("Server 404 error");
			xhr.abort();
		} else {
			ServerStatusUpdate(
				"xhrHandler " + xhr.status +
						" / " + xhr.statusText +
						" / " + xhr.readyState
			);
			if (xhr.readyState == 4){
				FunctionToInvoke(xhr.response)
			} //If Ready to access data
		} // If Access denied / allowed
	} // func xhr readyState

	xhr.open("GET", url);
	xhr.send();
}
