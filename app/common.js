var ServerStatusTimer = "empty";
var UName, slug, Deadline, UserJSON, updated_at, GoalsJSON;
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
var someVar = {updated_at:"",ArrayNo:""}
var RefreshTimeout = "empty"
var PictureArray = []

var NeuGoalsArray = []

/* --- --- --- ---		Global Functions			--- --- --- --- */
function xhrHandler(args){
	var xhr = new XMLHttpRequest();
	if (args.name) {var name = args.name + " ";} else {var name = ""}
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
function IfSet(input, bef, aft){ // TODO Implement
	var string

	if (input)		{
						string = 		input
		if (bef) 	{	string =  bef +	string			}
		if (aft) 	{	string =		string + aft	}
	}
	else 			{	string = ""						}

	return string
}
/* --- --- --- ---		Popup Functions				--- --- --- --- */
function PUinit(){ //
	chrome.storage.sync.get(
		{ // Data to retrieve
			username	: 	"",
			token		: 	"",
			DefaultGoal	:	0,
			GoalArray	:	[],
			GoalsData	:	[]
		},
		function(items) {
			UName = items.username;
			token = items.token;
			DefaultGoal = items.DefaultGoal;

			if (items.GoalsData.length >= 1){
				NeuGoalsArray = items.GoalsData
				//SetOutput(DefaultGoal)
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
	slug = NeuGoalsArray[e].slug
	document.getElementById("GraphLink").innerHTML = ""
	document.getElementById("GraphLink").appendChild(NeuGoalsArray[e].graph_img)
	//document.getElementById("graph-img") = NeuGoalsArray[e].graph_img
	//.src = NeuGoalsArray[e].graph_url + "?" + new Date().getTime()
	document.getElementById("GoalLoc").textContent = NeuGoalsArray[e].title;
	Deadline = NeuGoalsArray[e].losedate*1000
	document.getElementById("limsum").innerHTML = NeuGoalsArray[e].limsum;
	LinkBM(	"ButtonGoal" 						);
	LinkBM(	"GraphLink"							);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	someVar.updated_at = NeuGoalsArray[e].updated_at;
	someVar.ArrayNo = e
	clearTimeout(RefreshTimeout)
	InfoUpdate ("Output Set : " + e)
}
function DataRefresh(i){
	/*
		TODO
		[#]		xhr singular goal
		[#]		if updated at values are differetn {
		[ ]			merge neu and old goal
		[#]			setoutpt
		[ ]			sync new data with chrome
				}
	*/
	InfoUpdate(someVar)
	if (!i){
		xhrHandler({
			url:"/goals/" + slug + "/refresh_graph",
			name:"Refresh ",
			SuccessFunction : function (response){
				if (response === "true"){
					InfoUpdate ("Waiting for Graph to refresh");
					RefreshTimeout = setTimeout(function (){DataRefresh (1)},10000)
				} else if (response !== "true") {
					InfoUpdate ("Beeminder Sever Says no");
				} //If refresh true / !true
			}
		})
	}
	else if (i) {xhrHandler({
		url:"/goals/" + slug,
		name:"Refresh - Goal Update",
		SuccessFunction:function(response){
			InfoUpdate("iteration " + i)
			response = JSON.parse(response)
			if (response.updated_at === someVar.updated_at){// TODO Deal with someVar
				var time = 10000 * Math.pow(2,(i-1))
				if (i<=6) {
					RefreshTimeout = setTimeout(function (){DataRefresh (i+1)}, time);
					InfoUpdate("No Updated difference, giving it another swing,"
					/**/											+ i + " " + time)
				} else {
					InfoUpdate("The goal seems not to have updated, aborting refresh")
				}
			} else {
				NeuGoalsArray[someVar.ArrayNo] = ReturnGoalElement(response)
				SetOutput(someVar.ArrayNo)
				someVar.updated_at = response.updated_at
				console.log(NeuGoalsArray[someVar.ArrayNo])
				chrome.storage.sync.set(
					{GoalsData:NeuGoalsArray},
					function() {InfoUpdate("New goal data has been saved")}
				)
				InfoUpdate ("Graph Refreshed " + i + " " + someVar.updated_at);
			}
		} // SuccessFunction
	})} // xhrHandler
}
function HandleDownload(){
	xhrHandler({ // Goals Get
		url : "/goals",
		SuccessFunction : function (response){
			GoalsJSON = JSON.parse(response); // TODO Depreciate Variable
			var WorkingResponse = GoalsJSON

			for (i = 0; i < WorkingResponse.length; i++){
				NeuGoalsArray[i] = ReturnGoalElement(WorkingResponse[i])
			}
			chrome.storage.sync.set(
				{GoalsData:NeuGoalsArray},
				function() {InfoUpdate("Goal data has been saved")}
			)

			for (i = 0; i < GoalsJSON.length; i++){ // Image Handling
				PictureArray[i] = new Image()
				PictureArray[i].src = GoalsJSON[i].graph_url
			}
			InfoUpdate ("Data has been downloaded")

			if (DefaultGoal > GoalsJSON.length){DefaultGoal=0};
			SetOutput(DefaultGoal);
			setInterval( // Sets Deadline Counter
				function(){
					document.getElementById("dlout").innerHTML=countdown(Deadline).toString();
				},100
			);
			if (GoalsJSON.length > 1) { // Goal Selector
				for (i = 0; i < GoalsJSON.length; i++){
					var a = document.createElement('a');
					a.className = 'GoalIDBtn';
					a.id			= GoalsJSON[i].slug;
					a.textContent	= GoalsJSON[i].title;
					document.getElementById("TheContent").appendChild(a);
					(function(_i) {a.addEventListener(
							"click",
							function() {SetOutput(_i);}
					)})(i);// TODO: Add an additonal goto link w/ each Selector
				}
			};
		}
	})
}
function LinkBM(x,y,z) {
	if (!y) {var y = ""};
	if (!z){z = slug;}
	document.getElementById(x).href=
	"https://www.beeminder.com" + "/" + UName + "/" + z + "/" + y;
}
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
				( function(){
					UserGET();
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
	}
	ElementsList[DefaultGoal].defa.innerHTML = "Default";
}
/* --- --- --- ---		Unsorted Functions			--- --- --- --- */
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
function ReturnGoalElement (object) {
	var imgGraph = new Image()
	imgGraph.src = object.graph_url + "?" + new Date().getTime()
	var imgThumb = new Image()
	imgThumb.src = object.thumb_url + "?" + new Date().getTime()
	return {
		"slug"			: object.slug,
		"title"			: object.title,
		"description"	: object.description,
		"id"			: object.id,
		"graph_url"		: object.graph_url,
		"losedate"		: object.losedate,
		"limsum"		: object.limsum,
		"DataPoints"	: [],
		"updated_at"	: object.updated_at,
		"graph_url"		: object.graph_url,
		"graph_img"		: imgGraph,
		"thumb_url"		: object.thumb_url,
		"thumb"			: imgThumb,
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
