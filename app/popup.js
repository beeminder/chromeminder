var TimingVariable; //= setInterval(myTimer, 1000);
var UName, slug, deadline, LinkRefresh, LinkDatapoints, LinkSettings;
var BeeURL = "https://www.beeminder.com";
document.addEventListener('DOMContentLoaded', PUinit);
UName="OiYouYeahYou";
slug="writing";
function myTimer() {
	var d = new Date();
	document.getElementById("time").innerHTML =
		d.toLocaleTimeString() +
		" <small>Totally not a Countdown</small>";
}
function PUinit(){ //
	TimingVariable = setInterval(myTimer, 1000);
	/* TODO
		Load data from memory
		Load data from Beeminder
		Populate varaibles with data
		Set page content with data
	*/
	document.getElementById("ButtonGoal").href = LinkBM("");
	document.getElementById("ButtonRefresh").href = LinkBM("refresh");
	document.getElementById("ButtonData").href = LinkBM("datapoints");
	document.getElementById("ButtonSettings").href = LinkBM("settings");
	document.getElementById("OptLink").href = "/options.html";
}
function SetOutput(someVariable){
	//
}
function ChangeGoal (GoalNumber){
	//
}
function LinkBM(y){return BeeURL + "/" + UName + "/" + slug + "/" + y}
