var TimingVariable; //= setInterval(myTimer, 1000);
var UName,		Slug,		Deadline;
var ArrayUName,	ArraySlug,	ArrayDeadline;
var BeeURL = "https://www.beeminder.com";
function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>";
}///////////////////////////////////////////////////////////_pop
function PUinit(){ //
	TimingVariable = setInterval(myTimer, 1000);
	TestLoadData()
	/* TODO
		Load data from memory
		Load data from Beeminder
		Populate varaibles with data
		Set page content with data
	*/
	/* PSUEDO:
			Pull default from memory
				If Arrays are not equal in length > Do something
			load default
	*/
	SetOutput()
}///////////////////////////////////////////////////////////_pop
function TestLoadData(){
	var inFuncDate
	UName		= "OiYouYeahYou";
	Slug		= "writing";
	inFuncDate	= new Date();
	inFuncDate	. setDate(inFuncDate.getDate() + 1);
	inFuncDate	. setHours(0);
	inFuncDate	. setMinutes(0);
	inFuncDate	. setSeconds(0);
	Deadline	= inFuncDate
	//Array Muck
	ArrayUName = [
		"OiYouYeahYou",
		"OiYouYeahYou",
		"OiYouYeahYou"
	]
	ArraySlug = [
		"writing",
		"writemore",
		"emailmore"
	]
	ArrayDeadline = [
		inFuncDate,
		new Date("2016-08-18"),
		new Date("2017-02-15")
	]
}///////////////////////////////////////////////////////////_pop
function SetOutput(someVariable){
	document.getElementById("GoalLoc").innerHTML = UName + " / " + Slug;
	LinkBM(	"ButtonGoal",		""				);
	LinkBM(	"GraphLink",		""				);
	LinkBM(	"ButtonRefresh",	"refresh"		);
	LinkBM(	"ButtonData",		"datapoints"	);
	LinkBM(	"ButtonSettings",	"settings"		);
	// TODO: Set picture
	document.getElementById("graph-img").src=
		BeeURL + "/" + UName + "/" + Slug + "/graph";
}///////////////////////////////////////////////////////////_pop
function LoadGoal (GoalNumber){
	//from sync or server?
}///////////////////////////////////////////////////////////_pop
function TotalRecall(){
	/* PSUEDO:
			IF > Does saved data exist
				TRUE >
					How old is that data, IF > Age young
						TRUE >
							//
						FALSE >
							Load new
				FALSE >
					Load new
	*/
}///////////////////////////////////////////////////////////_pop
function LinkBM(x,y){
	document.getElementById(x)
		.href = BeeURL + "/" + UName + "/" + Slug + "/" + y;
}
////////////////////////////////////////////////////////////_pop
/* TODO: What Needs to be written?
			Menu Links:
				Goal Selector		.
				Dropdown content	.
				Break out links		.UName and Slug to construct links
			Countdown				.Deadline Date
			BareMin					.
			Graph Image				.
			Data Points				.
			Stats					.
	TODO: Vars I need for single goal
			UName
			Slug
			Deadline
			?BareMin: Current, NextMile, CALC:Delta
			?data-points
			?stats
*/
function save_options() {
	var color = document.getElementById('color').value;
	var likesColor = document.getElementById('like').checked;
	chrome.storage.sync.set(
		{
			favoriteColor: color,
			likesColor: likesColor
		},
		notify()
	);
}///////////////////////////////////////////////////////////Opt
function notify() {
	var status = document.getElementById('status');
	status.textContent = 'Options saved.';
	setTimeout(
		function() {status.textContent = '';},
		2000
	);
}///////////////////////////////////////////////////////////Opt
function restore_options() {
	// Use default value color = 'red' and likesColor = true.
	chrome.storage.sync.get(
		{
			favoriteColor: 'red',
			likesColor: true
		},
		function(items) {
			document.getElementById('color').value = items.favoriteColor;
			document.getElementById('like').checked = items.likesColor;
		}
	);
}///////////////////////////////////////////////////////////Opt
function DM(){
	var elem = document.getElementById('OiYouYeahYou-writing');
	elem.parentNode.removeChild(elem);
	return false;
}///////////////////////////////////////////////////////////Opt
function OPTinit(){
	document.addEventListener('DOMContentLoaded', restore_options);
	document.getElementById('save').addEventListener('click', save_options);
	document.getElementById('OiYouYeahYou-writing').addEventListener('click', DM);
}
