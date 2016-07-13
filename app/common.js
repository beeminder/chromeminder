var TimingVariable;
var ServerStatusTimer = "empty";
var UName,		Slug,		Deadline,	UserJSON, updated_at, response;
var BeeURL = "https://www.beeminder.com";
var ApiURL = "https://www.beeminder.com/api/v1/users/";
var DefaultGoal = 0;

function PUinit(){ //
	chrome.storage.sync.get(
		{
			username	: 	"",
			token		: 	"",
			DefaultGoal	:	0
		},
		function(items) {
			UName = items.username;
			token = items.token;
			DefaultGoal = items.DefaultGoal;
			if (items.username === "" || items.token === "") {
				var a = document.createElement('a');
				a.textContent = "You need to enter your details in the options page ";
				a.href = "/options.html"
				a.target = "_blank"
				document.getElementById("SeverStatus").insertBefore(a, document.getElementById(SeverStatus))
			} else {
				( function(){ GoalsGET(); } )( /**/ );
			} //If Data is blank
		} // function Sync Get
	);
}///////////////////////////////////////////////////////////_pop
function GoalsGET(){
	var xhr = new XMLHttpRequest();
	var url = ApiURL + UName + "/goals.json?auth_token=" + token;
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			ServerStatusUpdate("Server 404 error");
			xhr.abort();
		} else {
			/*LOGGING*/ServerStatusUpdate(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
			if (xhr.readyState == 4){
				response = JSON.parse(xhr.responseText);
				ServerStatusUpdate("Data has been downloaded")
				HandleDownload()
			}
		}
	}
	xhr.open("GET",url);
	xhr.send();
}///////////////////////////////////////////////////////////_pop
function HandleDownload(){
	if (DefaultGoal > response.length){DefaultGoal=0};
	SetOutput(DefaultGoal);
	TimingVariable = setInterval(
		function(){document.getElementById("dlout").innerHTML=countdown(Deadline).toString();},
		100
	);
	for (i = 0; i < response.length; i++){
		var a = document.createElement('a');
		a.className = 'GoalIDBtn';
		a.id = /*UName + '-' +*/ response[i].slug;
		a.textContent = /*UName + ' / ' +*/ response[i].title;
		document.getElementById("TheContent").appendChild(a);
		(function(_i) {
			a.addEventListener("click", function() {SetOutput(_i);});
		})(i);// TODO: Add an additonal goto link w/ each Selector
	};
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
	Slug = response[e].slug
	document.getElementById("graph-img").src=
		BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
	document.getElementById("GoalLoc").innerHTML = /*UName + " / " +*/ response[e].title;
	Deadline = response[e].losedate*1000
	document.getElementById("limsum").innerHTML = response[e].limsum;
	LinkBM(	"ButtonGoal",		""				);
	LinkBM(	"GraphLink",		""				);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	ServerStatusUpdate("Output Set : " + e)
}///////////////////////////////////////////////////////////_pop
function RefreshCurrentGraph(){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){
		if (xhr.status === 404) {
			ServerStatusUpdate("Server 404 error");
			xhr.abort();
		} else {
			/*LOGGING*/ServerStatusUpdate(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
			if (xhr.readyState == 4 && xhr.responseText === "true"){
				ServerStatusUpdate("Waiting for Graph to refresh")
				setTimeout(function (){
					document.getElementById("graph-img").src=
						BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
					ServerStatusUpdate("Graph Refreshed, but a page refresh needs to happen for new data");
					// TODO SetOutput with new data from a new xhr
				}, 5000);
			} else if (xhr.readyState == 4 && xhr.responseText !== "true") {
				ServerStatusUpdate("Beeminder Sever Says no");
			} //If Ready to access data & If refresh true
		} // If Access denied / allowed
	} // func xhr readyState

	xhr.open("GET",ApiURL + UName + "/goals/" + Slug + "/refresh_graph.json?auth_token=" + token);
	xhr.send();
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
			username:		document.getElementById( 'username'	).value,
			token:			document.getElementById( 'token'	).value,
			DefaultGoal:	DefaultGoal
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
			DefaultGoal	:	0
		},
		function(items) {
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
				( function(){ UserGET(); } )( /**/ );
				// TODO get User data
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById('save').addEventListener('click', save_options);
	//document.getElementById('OiYouYeahYou-writing').addEventListener('click', DM);
}
function UserGET(){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){

		if (xhr.status === 404) {
			ServerStatusUpdate("Server 404 error");
			xhr.abort();
			// TODO Notify User, Suggest checking options, Load old data if possible
		} else {
			ServerStatusUpdate(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
			if (xhr.readyState == 4){
				UserJSON = JSON.parse(xhr.responseText);

				drawList()

				if (updated_at === UserJSON.updated_at){
					// TODO No need to update > write output
					document.getElementById("UpdateDifference").innerHTML 	= "No Difference "
					/**/													+ updated_at + " - "
					/**/													+ UserJSON.updated_at;
				} else {
					// TODO There needs to be an update
					document.getElementById("UpdateDifference").innerHTML 	= "Difference "
					/**/													+ updated_at + " - "
					/**/													+ UserJSON.updated_at;
				} // If differnece detection
			} //If Ready to access data
		} // If Access denied / allowed
	} // func xhr readyState

	xhr.open("GET",BeeURL + "/api/v1/users/" + UName + ".json?auth_token=" + token);
	xhr.send();
}///////////////////////////////////////////////////////////_pop
var w = []
var aT = []
var aD = []
var aH = []
var aN = []
function drawList(){
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
		document.getElementById("TheList").appendChild(w[i]);
		document.getElementById(w[i].id).appendChild(aT[i]);
		document.getElementById(w[i].id).appendChild(aD[i]);
		document.getElementById(w[i].id).appendChild(aH[i]);
		document.getElementById(w[i].id).appendChild(aN[i]);
		(function(_i) {
			aD[i].addEventListener( "click", function() {DefaultHandle(_i);});
			// aH[i].addEventListener( "click", functions(){ HideHandle(i) } );
			// aN[i].addEventListener( "click", functions(){ NotifyHandle(i) } );
		})(i);
	}
	DefaultHandle (DefaultGoal)
}
/*
	==Goal title
	Default goal
	Hide in popup
	Notify

	Funcitons to append:	change default variable

*/
function DefaultHandle (i) {
	document.getElementById(aD[DefaultGoal].id).innerHTML = "-";
	document.getElementById(aD[i].id).innerHTML = "Default";
	DefaultGoal = i;
}
