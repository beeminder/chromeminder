var TimingVariable; //= setInterval(myTimer, 1000);
var UName,		Slug,		Deadline,	UserJSON, updated_at;
var ArrayUName,	ArraySlug,	ArrayDeadline;
var BeeURL = "https://www.beeminder.com";
var DefaultGoal = 0;
var response, data, responseusername;

function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>";
}///////////////////////////////////////////////////////////_pop
function PUinit(){ //
	TimingVariable = setInterval(myTimer, 1000);
	TestLoadData();

	SetOutput(DefaultGoal);
	for (i = 0; i < ArrayUName.length; i++){
		var a = document.createElement('a');
		a.className = 'GoalIDBtn';
		a.id = ArrayUName[i] + '-' + ArraySlug[i];
		a.textContent = ArrayUName[i] + ' / ' + ArraySlug[i];
		document.getElementById("TheContent").appendChild(a);
		(function(_i) {
			a.addEventListener("click", function() {SetOutput(_i);});
		})(i);// TODO: Add an additonal goto link w/ each Selector
	};

	stupid();
}///////////////////////////////////////////////////////////_pop
function stupid(){
	var xhr = new XMLHttpRequest();
	var baseURL = BeeURL + "/api/v1/users/"
	var url1 = baseURL + UName + "/goals.json?auth_token=" + token;
	var url2 = baseURL + UName + "/goals/writing.json?auth_token=" + token;
	xhr.onreadystatechange = function (){
		console.log(xhr.status + " / " + xhr.statusText + " / " + xhr.readyState);
		if (xhr.readyState == 4){
			data = xhr.responseText;
			console.log(data + ">>>" + url2);
			response = JSON.parse(data);
			console.log(response.username);
			responseusername = response.username;
		}
	}
	xhr.open("GET",url1);
	xhr.send();
}///////////////////////////////////////////////////////////_pop
function why(){console.log("responseusername = " + responseusername)}
function TestLoadData(){
	var inFuncDate
	// UName		= "OiYouYeahYou";
	// Slug		= "writing";
	inFuncDate	= new Date();
	inFuncDate	. setDate(inFuncDate.getDate() + 1);
	inFuncDate	. setHours(0);
	inFuncDate	. setMinutes(0);
	inFuncDate	. setSeconds(0);
	Deadline	= inFuncDate
	//Array Muck
	ArrayUName = [		"OiYouYeahYou",
						"OiYouYeahYou",
						"OiYouYeahYou"			]
	ArraySlug = [		"writing",
						"writemore",
						"emailmore"				]
	ArrayDeadline = [	inFuncDate,
						new Date("2016-08-18"),
						new Date("2017-02-15")	]
}///////////////////////////////////////////////////////////_pop
function SetOutput(e){
	UName = ArrayUName[e]
	Slug = ArraySlug[e]
	document.getElementById("GoalLoc").innerHTML = UName + " / " + Slug;
	LinkBM(	"ButtonGoal",		""				);
	LinkBM(	"GraphLink",		""				);
	LinkBM(	"ButtonRefresh",	"refresh"		);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	// TODO: Set picture
	document.getElementById("graph-img").src=
		BeeURL + "/" + UName + "/" + Slug + "/graph";
	console.log("Output Set : " + e)
}///////////////////////////////////////////////////////////_pop
function LinkBM(x,y){
	document.getElementById(x)
		.href = BeeURL + "/" + UName + "/" + Slug + "/" + y;
}
////////////////////////////////////////////////////////////_pop
function save_options() {
	var username	= document.getElementById( 'username'	).value;
	var token		= document.getElementById( 'token'		).value;
	chrome.storage.sync.set(
		{
			username: username,
			token: token
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
			updated_at	:	""
		},
		function(items) {
			document.getElementById( 'username'	).value = items.username;
			document.getElementById( 'token'	).value = items.token;
			updated_at = items.updated_at;
			UName = items.username;
			token = items.token;
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
			/* LOGGING*/console.log( xhr.status + " / " + xhr.statusText + " / " + xhr.readyState );
			/* LOGGING*/document.getElementById("ServerStaus").innerHTML =	xhr.status
																 + " / " + 	xhr.statusText
																 + " / " + 	xhr.readyState;
			if (xhr.readyState == 4){
				UserJSON = JSON.parse(xhr.responseText);

				if (updated_at === UserJSON.updated_at){
					// TODO No need to update > write output
					document.getElementById("UpdateDifference").innerHTML 	= "No Difference "
																			+ updated_at
																			+ " - "
																			+ UserJSON.updated_at;
				} else {
					// TODO There needs to be an update
					document.getElementById("UpdateDifference").innerHTML 	= "Difference "
																			+ updated_at + " - "
																			+ UserJSON.updated_at;
				} // If differnece detection
			} //If Ready to access data
		} // If Access denied / allowed
	} // func xhr readyState

	xhr.open("GET",BeeURL + "/api/v1/users/" + UName + ".json?auth_token=" + token);
	xhr.send();
}///////////////////////////////////////////////////////////_pop
