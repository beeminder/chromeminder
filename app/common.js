var TimingVariable, TimingPicture;
var ServerStatusTimer = "empty";
var UName,		Slug,		Deadline,	UserJSON, updated_at;
var ArrayUName,	ArraySlug,	ArrayDeadline;
var BeeURL = "https://www.beeminder.com";
var ApiURL = "https://www.beeminder.com/api/v1/users/";
var DefaultGoal = 0;
var response;

function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>";
}///////////////////////////////////////////////////////////_pop
function PUinit(){ //
	TimingVariable = setInterval(myTimer, 1000);
	document.getElementById("ButtonRefresh").addEventListener("click", RefreshCurrentGraph)
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
	var baseURL = BeeURL + "/api/v1/users/"
	var url = baseURL + UName + "/goals.json?auth_token=" + token;
	xhr.onreadystatechange = function (){
		console.log(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
		if (xhr.readyState == 4){
			response = JSON.parse(xhr.responseText);
			HandleDownload()
		}
	}
	xhr.open("GET",url);
	xhr.send();
}///////////////////////////////////////////////////////////_pop
function HandleDownload(){
	SetOutput(DefaultGoal)
	for (i = 0; i < response.length; i++){
		var a = document.createElement('a');
		a.className = 'GoalIDBtn';
		a.id = UName + '-' + response[i].slug;
		a.textContent = UName + ' / ' + response[i].slug;
		document.getElementById("TheContent").appendChild(a);
		(function(_i) {
				a.addEventListener("click", function() {SetOutput(_i);});
		})(i);// TODO: Add an additonal goto link w/ each Selector
	};
}
function why(){console.log("responseusername = " + responseusername)}
function SetOutput(e){
	Slug = response[e].slug
	document.getElementById("GoalLoc").innerHTML = UName + " / " + Slug;
	LinkBM(	"ButtonGoal",		""				);
	LinkBM(	"GraphLink",		""				);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	// TODO: Set picture
	document.getElementById("graph-img").src=
		BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
	console.log("Output Set : " + e)
}///////////////////////////////////////////////////////////_pop
function RefreshCurrentGraph(){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){

		if (xhr.status === 404) {
			console.log("Server 404 error");
			ServerStatusUpdate("Server 404 error");
			xhr.abort();
		}
		else { console.log("why"+xhr.responseText);
			/* LOGGING*/console.log( xhr.status + " / " + xhr.statusText + " / " + xhr.readyState );
			/* LOGGING*/ServerStatusUpdate(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
			if (xhr.readyState == 4 && xhr.responseText === "true"){
				ServerStatusUpdate("Waiting for Graph to refresh")
				setTimeout(function (){
					document.getElementById("graph-img").src=
						BeeURL + "/" + UName + "/" + Slug + "/graph?" + new Date().getTime();
					ServerStatusUpdate("Graph Refreshed");
				}, 5000);
			} else {
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
	ServerStatusTimer = setTimeout(
		function() {
			SeverStatus.textContent = '';
			ServerStatusTimer="empty"
		},
		5000
	);
}
function LinkBM(x,y){document.getElementById(x).href=BeeURL+"/"+UName+"/"+Slug+"/"+y;}
function save_options() {
	var username	= document.getElementById( 'username'	).value;
	var token		= document.getElementById( 'token'		).value;
	var DefaultGoal	= document.getElementById( 'defGoal'	).value;
	chrome.storage.sync.set(
		{
			username: username,
			token: token,
			DefaultGoal: DefaultGoal
		},
		notify()
	);
}///////////////////////////////////////////////////////////Opt
function notify() {
	var status = document.getElementById('status');
	status.textContent = 'Options saved.';
	setTimeout(function() {status.textContent = '';},2000);
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
			document.getElementById( 'defGoal'	).value = items.DefaultGoal;
			updated_at = items.updated_at;
			UName = items.username;
			token = items.token;
			DefaultGoal = items.DefaultGoal;
			if (items.username === "" || items.token === "") {
				// TODO Goto options page
				console.log("There be no data")
			} else {
				( function(){ UserGET(); } )( /**/ );
				// TODO get User data
			} //If Data is blank
		} // function Sync Get
	);
	document.getElementById('save').addEventListener('click', save_options);
	document.getElementById('OiYouYeahYou-writing').addEventListener('click', DM);
}
function UserGET(){
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function (){

		if (xhr.status === 404) {
			console.log("Server 404 error");
			xhr.abort();
			// TODO Notify User, Suggest checking options, Load old data if possible
		} else {
			console.log( xhr.status + " / " + xhr.statusText + " / " + xhr.readyState );
			ServerStatusUpdate(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
			if (xhr.readyState == 4){
				UserJSON = JSON.parse(xhr.responseText);

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
